export function buildNoteAttachmentMetadata(note: {
  $id?: string;
  title?: string | null;
  content?: string | null;
}) {
  return {
    type: 'attachment',
    entity: 'note',
    subType: 'shared_note',
    referenceId: note.$id || null,
    payload: {
      label: note.title || 'Attached Note',
      preview: String(note.content || '').slice(0, 100),
    },
  };
}
