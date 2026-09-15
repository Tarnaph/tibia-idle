import { Schema, type } from '@colyseus/schema';

export class ChatMessageSchema extends Schema {
  @type('string') id: string = '';
  @type('string') senderId: string = '';
  @type('string') senderName: string = '';
  @type('string') senderTitle: string = ''; // 'GOD' | 'GM' | ''
  @type('string') text: string = '';
  @type('string') channel: string = 'say'; // 'say' | 'yell' | 'global' | 'party'
  @type('number') timestamp: number = 0;
}
