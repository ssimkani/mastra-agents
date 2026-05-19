import 'dotenv/config';
import { Composio } from '@composio/core';

const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY! });
const accounts = await composio.connectedAccounts.list({
  userIds: [process.env.COMPOSIO_USER_ID!],
});
console.log('user_id used:', JSON.stringify(process.env.COMPOSIO_USER_ID));
console.log('result:', JSON.stringify(accounts, null, 2));
