export const mockNotes = [
  {
    id: 'test-note-1',
    title: 'Welcome Note',
    content: 'This is a sample note for automated testing.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'long-note',
    title: 'Long Content Test',
    content: 'A'.repeat(5000), // Testing performance with long text
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export const aiInputs = {
  short: 'Summarize this.',
  long: 'Give me a detailed breakdown and analysis of the following points...',
};
