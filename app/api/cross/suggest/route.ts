import { NextRequest, NextResponse } from 'next/server';

type Suggestion = {
  id: string;
  label: string;
  description: string;
};

function buildSuggestions(sourceApp: string, sourceType: string, sourceId: string | null): Suggestion[] {
  const baseId = sourceId || 'unknown';

  if (sourceApp === 'note' || sourceType === 'note') {
    return [
      { id: `share:${baseId}`, label: 'Share to Chat', description: 'Send the note into a DM or group thread.' },
      { id: `task:${baseId}`, label: 'Create Task', description: 'Turn the note into a task and keep the conversation in one tab.' },
      { id: `secret:${baseId}`, label: 'Attach Secret', description: 'Link a Vault credential if the note references one.' },
    ];
  }

  if (sourceType === 'message' || sourceApp === 'connect') {
    return [
      { id: `note:${baseId}`, label: 'Attach Note', description: 'Pull a note into the message context.' },
      { id: `task:${baseId}`, label: 'Create Task', description: 'Promote the message into a Flow task.' },
    ];
  }

  return [
    { id: `share:${baseId}`, label: 'Share', description: 'Expose a chat sharing action.' },
    { id: `note:${baseId}`, label: 'Attach Note', description: 'Expose a note-linking action.' },
  ];
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const sourceApp = url.searchParams.get('sourceApp') || '';
  const sourceType = url.searchParams.get('sourceType') || '';
  const sourceId = url.searchParams.get('sourceId');

  return NextResponse.json({
    sourceApp,
    sourceType,
    sourceId,
    suggestions: buildSuggestions(sourceApp, sourceType, sourceId),
  });
}
