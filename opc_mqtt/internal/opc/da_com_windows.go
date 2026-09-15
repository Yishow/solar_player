//go:build windows

package opc

import (
	"fmt"
	"runtime"
	"syscall"
	"unsafe"

	"github.com/go-ole/go-ole"
)

type iopcServer struct {
	RawVTable *iopcServerVtbl
}

// IOPCServer method order follows the OPC DA custom-interface IDL.
type iopcServerVtbl struct {
	QueryInterface        uintptr
	AddRef                uintptr
	Release               uintptr
	AddGroup              uintptr
	GetErrorString        uintptr
	GetGroupByName        uintptr
	GetStatus             uintptr
	RemoveGroup           uintptr
	CreateGroupEnumerator uintptr
}

type iopcItemMgt struct {
	RawVTable *iopcItemMgtVtbl
}

type iopcItemMgtVtbl struct {
	QueryInterface   uintptr
	AddRef           uintptr
	Release          uintptr
	AddItems         uintptr
	ValidateItems    uintptr
	RemoveItems      uintptr
	SetActiveState   uintptr
	SetClientHandles uintptr
	SetDatatypes     uintptr
	CreateEnumerator uintptr
}

type iopcSyncIO struct {
	RawVTable *iopcSyncIOVtbl
}

type iopcSyncIOVtbl struct {
	QueryInterface uintptr
	AddRef         uintptr
	Release        uintptr
	Read           uintptr
	Write          uintptr
}

type opcDAClient struct {
	server       *iopcServer
	group        *ole.IUnknown
	itemMgt      *iopcItemMgt
	syncIO       *iopcSyncIO
	groupHandle  uint32
	groupCreated bool
}

type opcReadBatch struct {
	statesPtr unsafe.Pointer
	errorsPtr unsafe.Pointer
	states    []opcItemState
	errors    []int32
}

func newOPCDAClient(unknown *ole.IUnknown) (*opcDAClient, error) {
	if unknown == nil {
		return nil, fmt.Errorf("QueryInterface(IOPCServer): nil COM object")
	}

	var server *iopcServer
	if err := unknown.PutQueryInterface(opcServerIID, &server); err != nil {
		return nil, fmt.Errorf("QueryInterface(IOPCServer): %w", err)
	}
	return &opcDAClient{server: server}, nil
}

func (c *opcDAClient) CreateGroup(requestedUpdateRate uint32) error {
	if c == nil || c.server == nil {
		return fmt.Errorf("IOPCServer::AddGroup: server is not connected")
	}
	c.closeGroup()

	name, err := syscall.UTF16PtrFromString("opc_mqtt")
	if err != nil {
		return fmt.Errorf("IOPCServer::AddGroup name: %w", err)
	}

	var group *ole.IUnknown
	var serverHandle uint32
	var revisedUpdateRate uint32
	hrRaw, _, _ := syscall.SyscallN(
		c.server.RawVTable.AddGroup,
		uintptr(unsafe.Pointer(c.server)),
		uintptr(unsafe.Pointer(name)),
		uintptr(1),
		uintptr(requestedUpdateRate),
		uintptr(1),
		0,
		0,
		0,
		uintptr(unsafe.Pointer(&serverHandle)),
		uintptr(unsafe.Pointer(&revisedUpdateRate)),
		uintptr(unsafe.Pointer(ole.IID_IUnknown)),
		uintptr(unsafe.Pointer(&group)),
	)
	runtime.KeepAlive(name)
	hr := int32(uint32(hrRaw))
	if hresultFailed(hr) {
		if group != nil {
			group.Release()
		}
		return hresultError("IOPCServer::AddGroup", hr)
	}
	if group == nil {
		return fmt.Errorf("IOPCServer::AddGroup: server returned nil group")
	}

	c.group = group
	c.groupHandle = serverHandle
	c.groupCreated = true
	if err := group.PutQueryInterface(opcItemMgtIID, &c.itemMgt); err != nil {
		c.closeGroup()
		return fmt.Errorf("QueryInterface(IOPCItemMgt): %w", err)
	}
	if err := group.PutQueryInterface(opcSyncIOIID, &c.syncIO); err != nil {
		c.closeGroup()
		return fmt.Errorf("QueryInterface(IOPCSyncIO): %w", err)
	}
	return nil
}

func (c *opcDAClient) AddItems(addresses []string) ([]uint32, []int32, error) {
	if c == nil || c.itemMgt == nil {
		return nil, nil, fmt.Errorf("IOPCItemMgt::AddItems: group is not connected")
	}
	if len(addresses) == 0 {
		return []uint32{}, []int32{}, nil
	}

	emptyPath, err := syscall.UTF16PtrFromString("")
	if err != nil {
		return nil, nil, fmt.Errorf("IOPCItemMgt::AddItems access path: %w", err)
	}
	itemIDs := make([]*uint16, len(addresses))
	defs := make([]opcItemDef, len(addresses))
	for i, address := range addresses {
		itemID, convErr := syscall.UTF16PtrFromString(address)
		if convErr != nil {
			return nil, nil, fmt.Errorf("OPC item address %q: %w", address, convErr)
		}
		itemIDs[i] = itemID
		defs[i] = opcItemDef{
			AccessPath:        emptyPath,
			ItemID:            itemID,
			Active:            1,
			ClientHandle:      uint32(i + 1),
			RequestedDataType: uint16(ole.VT_EMPTY),
		}
	}

	var resultsPtr unsafe.Pointer
	var errorsPtr unsafe.Pointer
	hrRaw, _, _ := syscall.SyscallN(
		c.itemMgt.RawVTable.AddItems,
		uintptr(unsafe.Pointer(c.itemMgt)),
		uintptr(len(defs)),
		uintptr(unsafe.Pointer(&defs[0])),
		uintptr(unsafe.Pointer(&resultsPtr)),
		uintptr(unsafe.Pointer(&errorsPtr)),
	)
	runtime.KeepAlive(emptyPath)
	runtime.KeepAlive(itemIDs)
	runtime.KeepAlive(defs)

	if resultsPtr == nil || errorsPtr == nil {
		freeAddItemsBuffers(resultsPtr, errorsPtr, len(addresses))
		return nil, nil, fmt.Errorf("IOPCItemMgt::AddItems: server returned incomplete buffers")
	}
	defer freeAddItemsBuffers(resultsPtr, errorsPtr, len(addresses))

	hr := int32(uint32(hrRaw))
	if hresultFailed(hr) {
		return nil, nil, hresultError("IOPCItemMgt::AddItems", hr)
	}

	results := unsafe.Slice((*opcItemResult)(resultsPtr), len(addresses))
	itemErrors := unsafe.Slice((*int32)(errorsPtr), len(addresses))
	handles := make([]uint32, len(addresses))
	errorsCopy := make([]int32, len(addresses))
	for i := range results {
		handles[i] = results[i].ServerHandle
		errorsCopy[i] = itemErrors[i]
	}
	return handles, errorsCopy, nil
}

func (c *opcDAClient) Read(handles []uint32) (*opcReadBatch, error) {
	if c == nil || c.syncIO == nil {
		return nil, fmt.Errorf("IOPCSyncIO::Read: group is not connected")
	}
	if len(handles) == 0 {
		return &opcReadBatch{}, nil
	}

	batch := &opcReadBatch{}
	hrRaw, _, _ := syscall.SyscallN(
		c.syncIO.RawVTable.Read,
		uintptr(unsafe.Pointer(c.syncIO)),
		uintptr(opcDevice),
		uintptr(len(handles)),
		uintptr(unsafe.Pointer(&handles[0])),
		uintptr(unsafe.Pointer(&batch.statesPtr)),
		uintptr(unsafe.Pointer(&batch.errorsPtr)),
	)
	runtime.KeepAlive(handles)

	hr := int32(uint32(hrRaw))
	if hresultFailed(hr) {
		batch.Close()
		return nil, hresultError("IOPCSyncIO::Read", hr)
	}
	if batch.statesPtr == nil || batch.errorsPtr == nil {
		batch.Close()
		return nil, fmt.Errorf("IOPCSyncIO::Read: server returned incomplete buffers")
	}
	batch.states = unsafe.Slice((*opcItemState)(batch.statesPtr), len(handles))
	batch.errors = unsafe.Slice((*int32)(batch.errorsPtr), len(handles))
	return batch, nil
}

func (b *opcReadBatch) Close() {
	if b == nil {
		return
	}
	for i := range b.states {
		_ = ole.VariantClear(&b.states[i].Value)
	}
	if b.statesPtr != nil {
		ole.CoTaskMemFree(uintptr(b.statesPtr))
	}
	if b.errorsPtr != nil {
		ole.CoTaskMemFree(uintptr(b.errorsPtr))
	}
	b.statesPtr = nil
	b.errorsPtr = nil
	b.states = nil
	b.errors = nil
}

func (c *opcDAClient) Close() {
	if c == nil {
		return
	}
	c.closeGroup()
	if c.server != nil {
		releaseCOM(unsafe.Pointer(c.server), c.server.RawVTable.Release)
		c.server = nil
	}
}

func (c *opcDAClient) closeGroup() {
	if c == nil {
		return
	}
	if c.syncIO != nil {
		releaseCOM(unsafe.Pointer(c.syncIO), c.syncIO.RawVTable.Release)
		c.syncIO = nil
	}
	if c.itemMgt != nil {
		releaseCOM(unsafe.Pointer(c.itemMgt), c.itemMgt.RawVTable.Release)
		c.itemMgt = nil
	}
	if c.group != nil {
		c.group.Release()
		c.group = nil
	}
	if c.server != nil && c.groupCreated {
		_, _, _ = syscall.SyscallN(
			c.server.RawVTable.RemoveGroup,
			uintptr(unsafe.Pointer(c.server)),
			uintptr(c.groupHandle),
			0,
		)
	}
	c.groupHandle = 0
	c.groupCreated = false
}

func releaseCOM(instance unsafe.Pointer, releaseMethod uintptr) {
	if instance == nil || releaseMethod == 0 {
		return
	}
	_, _, _ = syscall.SyscallN(releaseMethod, uintptr(instance))
}

func freeAddItemsBuffers(resultsPtr, errorsPtr unsafe.Pointer, count int) {
	if resultsPtr != nil {
		results := unsafe.Slice((*opcItemResult)(resultsPtr), count)
		for i := range results {
			if results[i].Blob != nil {
				ole.CoTaskMemFree(uintptr(unsafe.Pointer(results[i].Blob)))
			}
		}
		ole.CoTaskMemFree(uintptr(resultsPtr))
	}
	if errorsPtr != nil {
		ole.CoTaskMemFree(uintptr(errorsPtr))
	}
}
