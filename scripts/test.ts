import { knowledge } from '../mastra/workspaces/knowledge';

async function queryMarkdownKnowledgeBase() {
  // 1. Build and index the text token tables [1.162, 1.146]
  await knowledge.init();

  // 2. Directly query the keyword index without relying on LLM argument formatting [1.1984]
  const skills = await knowledge.skills?.list();

  console.log(skills);
}

queryMarkdownKnowledgeBase();