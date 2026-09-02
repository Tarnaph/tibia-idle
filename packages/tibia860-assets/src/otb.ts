const OTB_ESCAPE = 0xfd;
const OTB_START = 0xfe;
const OTB_END = 0xff;
const OTB_ATTR_SERVER_ID = 0x10;
const OTB_ATTR_CLIENT_ID = 0x11;

interface OtbNode {
  type: number;
  props: number[];
  children: OtbNode[];
}

function node(buffer: Buffer, startOffset: number): { value: OtbNode; nextOffset: number } {
  if (buffer[startOffset] !== OTB_START) throw new Error('Invalid OTB node start.');
  let offset = startOffset + 1;
  const value: OtbNode = { type: buffer[offset], props: [], children: [] };
  offset += 1;
  while (offset < buffer.length) {
    const byte = buffer[offset];
    offset += 1;
    if (byte === OTB_ESCAPE) {
      value.props.push(buffer[offset]);
      offset += 1;
    } else if (byte === OTB_START) {
      const child = node(buffer, offset - 1);
      value.children.push(child.value);
      offset = child.nextOffset;
    } else if (byte === OTB_END) {
      return { value, nextOffset: offset };
    } else {
      value.props.push(byte);
    }
  }
  throw new Error('Unterminated OTB node.');
}

export function findOtbClientId(buffer: Buffer, requestedServerId: number): { clientId: number; group: number } {
  const root = node(buffer, 4).value;
  for (const child of root.children) {
    const props = Buffer.from(child.props);
    let serverId: number | undefined;
    let clientId: number | undefined;
    let offset = 4;
    while (offset + 3 <= props.length) {
      const attribute = props[offset];
      const length = props.readUInt16LE(offset + 1);
      offset += 3;
      if (offset + length > props.length) throw new Error('Invalid OTB attribute length.');
      if (attribute === OTB_ATTR_SERVER_ID && length === 2) serverId = props.readUInt16LE(offset);
      if (attribute === OTB_ATTR_CLIENT_ID && length === 2) clientId = props.readUInt16LE(offset);
      offset += length;
    }
    if (serverId === requestedServerId && clientId !== undefined) return { clientId, group: child.type };
  }
  throw new Error(`Server item ${requestedServerId} was not found in items.otb.`);
}

export function tryFindOtbClientId(
  buffer: Buffer,
  requestedServerId: number,
): { clientId: number; group: number } | undefined {
  try {
    return findOtbClientId(buffer, requestedServerId);
  } catch {
    return undefined;
  }
}
