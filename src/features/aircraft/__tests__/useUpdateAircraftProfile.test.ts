import { classifyAircraftUpdateError } from '../useUpdateAircraftProfile';

// Same "test the pure error classifier directly" pattern as
// useAddTimelineEntry.test.ts's classifyAddTimelineEntryError coverage —
// the mutation hook itself is a thin useMutation/useQueryClient wrapper with
// no orchestration logic of its own to unit test in isolation.
describe('classifyAircraftUpdateError', () => {
  it('classifies a network-flavored error message', () => {
    expect(classifyAircraftUpdateError(new Error('Network request failed'))).toMatch(
      /check your connection/i,
    );
  });

  it('falls back to the generic copy for anything else', () => {
    expect(classifyAircraftUpdateError(new Error('boom'))).toMatch(/didn't save/i);
  });

  it('falls back to the generic copy for a non-Error value', () => {
    expect(classifyAircraftUpdateError('boom')).toMatch(/didn't save/i);
  });
});
