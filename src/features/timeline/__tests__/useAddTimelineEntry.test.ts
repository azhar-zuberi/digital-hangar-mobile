import {
  classifyAddTimelineEntryError,
  createTimelineEntryWithPhotos,
  type AddTimelineEntryInput,
} from '../useAddTimelineEntry';
import * as timelineApi from '../timelineApi';
import { ImageUploadError, uploadImage } from '../../../services/imageUpload';

jest.mock('../timelineApi');
jest.mock('../../../services/imageUpload', () => {
  const actual = jest.requireActual('../../../services/imageUpload');
  return {
    ...actual,
    uploadImage: jest.fn(),
  };
});

const mockedInsertTimelineEntry = timelineApi.insertTimelineEntry as jest.Mock;
const mockedInsertTimelinePhotos = timelineApi.insertTimelinePhotos as jest.Mock;
const mockedUploadImage = uploadImage as jest.Mock;

const baseInput: AddTimelineEntryInput = {
  aircraftId: 'aircraft-1',
  type: 'memory',
  title: '  First solo flight  ',
  description: '  What a day.  ',
  eventDate: new Date(2024, 5, 1),
  photoUris: [],
};

const insertedEntry = {
  id: 'entry-1',
  aircraft_id: 'aircraft-1',
  created_by: 'user-1',
  type: 'memory' as const,
  title: 'First solo flight',
  description: 'What a day.',
  event_date: '2024-06-01',
  created_at: '2024-06-01T00:00:00Z',
  photos: [],
};

// Critical flow per docs/TDD.md §19 ("timeline creation"): entry insert,
// then upload + link any photos. Tests the pure orchestration function
// directly (exported from useAddTimelineEntry.ts for exactly this reason)
// rather than mounting the mutation hook, since it has no React/TanStack
// dependency of its own.
describe('createTimelineEntryWithPhotos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedInsertTimelineEntry.mockResolvedValue(insertedEntry);
    mockedInsertTimelinePhotos.mockResolvedValue([]);
  });

  it('trims title/description and converts the date to a YYYY-MM-DD string on insert', async () => {
    await createTimelineEntryWithPhotos(baseInput, 'user-1');

    expect(mockedInsertTimelineEntry).toHaveBeenCalledWith({
      aircraftId: 'aircraft-1',
      createdBy: 'user-1',
      type: 'memory',
      title: 'First solo flight',
      description: 'What a day.',
      eventDate: '2024-06-01',
    });
  });

  it('stores an empty description as null rather than an empty string', async () => {
    await createTimelineEntryWithPhotos({ ...baseInput, description: '   ' }, 'user-1');

    expect(mockedInsertTimelineEntry).toHaveBeenCalledWith(
      expect.objectContaining({ description: null }),
    );
  });

  it('returns the entry unchanged and never uploads when there are no photos', async () => {
    const result = await createTimelineEntryWithPhotos(baseInput, 'user-1');

    expect(mockedUploadImage).not.toHaveBeenCalled();
    expect(mockedInsertTimelinePhotos).not.toHaveBeenCalled();
    expect(result).toEqual(insertedEntry);
  });

  it('uploads each photo sequentially and links the resulting storage paths', async () => {
    mockedUploadImage
      .mockResolvedValueOnce({ storagePath: 'aircraft-1/a.jpg', width: 10, height: 10 })
      .mockResolvedValueOnce({ storagePath: 'aircraft-1/b.jpg', width: 10, height: 10 });
    const linkedPhotos = [
      { id: 'p1', storage_path: 'aircraft-1/a.jpg', created_at: '2024-06-01T00:00:00Z' },
      { id: 'p2', storage_path: 'aircraft-1/b.jpg', created_at: '2024-06-01T00:00:01Z' },
    ];
    mockedInsertTimelinePhotos.mockResolvedValue(linkedPhotos);

    const result = await createTimelineEntryWithPhotos(
      { ...baseInput, photoUris: ['file://a.jpg', 'file://b.jpg'] },
      'user-1',
    );

    expect(mockedUploadImage).toHaveBeenCalledTimes(2);
    expect(mockedInsertTimelinePhotos).toHaveBeenCalledWith('entry-1', [
      'aircraft-1/a.jpg',
      'aircraft-1/b.jpg',
    ]);
    expect(result.photos).toEqual(linkedPhotos);
  });

  it('leaves the entry created (not rolled back) if a photo upload fails', async () => {
    mockedUploadImage.mockRejectedValue(new ImageUploadError('unknown'));

    await expect(
      createTimelineEntryWithPhotos({ ...baseInput, photoUris: ['file://a.jpg'] }, 'user-1'),
    ).rejects.toThrow();

    // The entry insert already happened and is not undone — documented
    // tradeoff in useAddTimelineEntry.ts's header comment, mirroring
    // aircraftApi.ts's create-then-upload sequencing for aircraft photos.
    expect(mockedInsertTimelineEntry).toHaveBeenCalledTimes(1);
    expect(mockedInsertTimelinePhotos).not.toHaveBeenCalled();
  });
});

describe('classifyAddTimelineEntryError', () => {
  it('surfaces an ImageUploadError message directly', () => {
    const error = new ImageUploadError('oversized');
    expect(classifyAddTimelineEntryError(error)).toBe(error.message);
  });

  it('classifies a network-ish error message as the network copy', () => {
    expect(classifyAddTimelineEntryError(new Error('Network request failed'))).toMatch(
      /connection/i,
    );
  });

  it('falls back to the generic copy for anything unrecognized', () => {
    expect(classifyAddTimelineEntryError(new Error('boom'))).toMatch(/didn't save/i);
  });
});
