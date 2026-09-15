package mqtt

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	pahomqtt "github.com/eclipse/paho.mqtt.golang"

	"opc_mqtt/internal/config"
	"opc_mqtt/internal/engine"
	"opc_mqtt/internal/state"
)

var errNotConnected = errors.New("mqtt: not connected")

type Publisher struct {
	client pahomqtt.Client
	st     *state.State
}

func New(st *state.State) *Publisher {
	return &Publisher{st: st}
}

func (p *Publisher) Connect(broker string, port int, qos byte, retain bool) error {
	_ = qos
	_ = retain

	p.Disconnect()

	options := pahomqtt.NewClientOptions().
		AddBroker(fmt.Sprintf("tcp://%s:%d", broker, port)).
		SetClientID("opc_mqtt_bridge").
		SetAutoReconnect(true).
		SetOnConnectHandler(func(_ pahomqtt.Client) {
			if p.st != nil {
				p.st.SetMqttConnected(true)
			}
		}).
		SetConnectionLostHandler(func(_ pahomqtt.Client, err error) {
			if p.st != nil {
				p.st.SetMqttConnected(false)
				p.st.AddError(fmt.Sprintf("MQTT 連線中斷: %v", err))
			}
		})

	client := pahomqtt.NewClient(options)
	token := client.Connect()
	if ok := token.WaitTimeout(5 * time.Second); !ok {
		if p.st != nil {
			p.st.SetMqttConnected(false)
		}
		return errors.New("mqtt connect timeout")
	}
	if err := token.Error(); err != nil {
		if p.st != nil {
			p.st.SetMqttConnected(false)
		}
		return err
	}

	p.client = client
	if p.st != nil {
		p.st.SetMqttConnected(true)
	}
	return nil
}

func (p *Publisher) Disconnect() {
	if p.client != nil {
		p.client.Disconnect(500)
		p.client = nil
	}
	if p.st != nil {
		p.st.SetMqttConnected(false)
	}
}

func (p *Publisher) PublishVirtual(prefix string, results []engine.Result, qos byte, retain bool) error {
	if p.client == nil || !p.client.IsConnected() {
		return errNotConnected
	}

	ts := time.Now().Format(time.RFC3339)
	for _, result := range results {
		if !result.Ok {
			continue
		}

		payload, err := json.Marshal(map[string]any{
			"value": result.Value,
			"unit":  result.Unit,
			"ts":    ts,
		})
		if err != nil {
			return err
		}

		topic := fmt.Sprintf("%s/%s", prefix, result.Name)
		token := p.client.Publish(topic, qos, retain, payload)
		token.Wait()
		if err := token.Error(); err != nil {
			if p.st != nil {
				p.st.AddError(fmt.Sprintf("publish %s 失敗: %v", topic, err))
			}
			return err
		}
	}
	return nil
}

func (p *Publisher) PublishRaw(prefix string, tags []config.TagConfig, rawValues map[string]state.TagValue, qos byte, retain bool) error {
	if p.client == nil || !p.client.IsConnected() {
		return errNotConnected
	}

	ts := time.Now().Format(time.RFC3339)
	for _, tag := range tags {
		if !tag.Enabled {
			continue
		}

		tagValue, ok := rawValues[tag.ID]
		if !ok || !tagValue.Ok {
			continue
		}

		payload, err := json.Marshal(map[string]any{
			"value": tagValue.Value,
			"unit":  tag.Unit,
			"ts":    ts,
		})
		if err != nil {
			return err
		}

		topic := fmt.Sprintf("%s/raw/%s", prefix, tag.ID)
		token := p.client.Publish(topic, qos, retain, payload)
		token.Wait()
		if err := token.Error(); err != nil {
			if p.st != nil {
				p.st.AddError(fmt.Sprintf("publish raw %s 失敗: %v", topic, err))
			}
			return err
		}
	}
	return nil
}
