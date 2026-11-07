/**
 * What `tools/list` advertises for the tools a manager registers.
 *
 * `registerOn()` is handed a real `McpServer`, and the list is read over an
 * `InMemoryTransport` with a 2025-era handshake and serialized as JSON, so the
 * result is exactly what the SDK sends. Both eras and the stdio entry point
 * are covered in test/server/wireProtocol.test.ts.
 */
import { InMemoryTransport, McpServer, type Tool } from '@modelcontextprotocol/server';

export async function listTools(manager: { registerOn(server: McpServer): void }): Promise<Tool[]> {
  const server = new McpServer({ name: 'list-tools', version: '0.0.0' }, { capabilities: { tools: { listChanged: false } } });
  manager.registerOn(server);

  const [clientEnd, serverEnd] = InMemoryTransport.createLinkedPair();
  const responses = new Map<number, (message: Record<string, any>) => void>();
  clientEnd.onmessage = (message) => {
    const frame = message as Record<string, any>;
    responses.get(frame.id)?.(frame);
  };
  const request = (id: number, method: string, params?: Record<string, unknown>) =>
    new Promise<Record<string, any>>((resolve) => {
      responses.set(id, resolve);
      void clientEnd.send({ jsonrpc: '2.0', id, method, ...(params && { params }) });
    });

  await server.connect(serverEnd);
  try {
    await request(1, 'initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'list-tools', version: '0' } });
    await clientEnd.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    const response = await request(2, 'tools/list');
    if (response.error) throw new Error(`tools/list failed: ${JSON.stringify(response.error)}`);
    // InMemoryTransport hands objects over as they are; a real transport sends
    // JSON, which drops the keys the SDK sets to undefined.
    return JSON.parse(JSON.stringify(response.result.tools)) as Tool[];
  } finally {
    await server.close();
  }
}
