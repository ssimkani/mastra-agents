import { Workspace, LocalFilesystem } from '@mastra/core/workspace';

export const workspace = new Workspace({
  filesystem: new LocalFilesystem({ basePath: './workspace' }),
  skills: ['skills'],
});
