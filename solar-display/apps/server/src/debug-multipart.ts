import Fastify from 'fastify';

async function main() {
  const app = Fastify({ logger: false });
  await app.register((await import('@fastify/multipart')).default, { 
    limits: { fileSize: 10 * 1024 * 1024 } 
  });
  
  app.post('/test', async (req, reply) => {
    try {
      console.log('isMultipart:', req.isMultipart());
      console.log('content-type:', req.headers['content-type']);
      const file = await req.file();
      console.log('file:', file ? 'found' : 'null');
      console.log('filename:', file?.filename);
      console.log('mimetype:', file?.mimetype);
    } catch (e: any) {
      console.log('error:', e.message);
    }
    return { ok: true };
  });

  const boundary = '----TestBoundary123';
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const body = Buffer.concat([
    Buffer.from('--' + boundary + '\r\n'),
    Buffer.from('Content-Disposition: form-data; name="file"; filename="test.png"\r\n'),
    Buffer.from('Content-Type: image/png\r\n\r\n'),
    png,
    Buffer.from('\r\n--' + boundary + '--\r\n')
  ]);

  const res = await app.inject({
    method: 'POST',
    url: '/test',
    headers: { 'content-type': 'multipart/form-data; boundary=' + boundary },
    payload: body
  });
  
  console.log('status:', res.statusCode);
  console.log('body:', res.body);
  await app.close();
}

main().catch(console.error);
