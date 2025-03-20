// server/src/controllers/searchController.ts
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { SearchHistory } from '../models/SearchHistory';
import { openverseAPI, SearchParams } from '../services/openverseService';

// Search media (images and audio)
export const searchMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { query, page = 1, pageSize = 20, mediaType = 'all', ...filters } = req.query;

    // Build search parameters
    const searchParams: SearchParams = {
      q: query as string,
      page: Number(page),
      page_size: Number(pageSize),
      ...formatFilters(filters),
    };

    // Execute search based on media type
    let results;
    let resultCount = 0;

    switch (mediaType) {
      case 'image':
        results = await openverseAPI.searchImages(searchParams);
        resultCount = results.result_count;
        break;
      case 'audio':
        results = await openverseAPI.searchAudio(searchParams);
        resultCount = results.result_count;
        break;
      case 'all':
      default:
        // Search both images and audio and combine results
        const [imageResults, audioResults] = await Promise.all([
          openverseAPI.searchImages(searchParams),
          openverseAPI.searchAudio(searchParams),
        ]);
        
        resultCount = imageResults.result_count + audioResults.result_count;
        
        // Interlace results (simplified - would need better pagination handling in production)
        results = {
          result_count: resultCount,
          page_count: Math.max(imageResults.page_count, audioResults.page_count),
          page_size: Number(pageSize),
          page: Number(page),
          results: [...imageResults.results, ...audioResults.results],
        };
        break;
    }

    // Save search to history if user is authenticated
    if (req.user) {
      await SearchHistory.create({
        userId: req.user.id,
        query: query as string,
        filters: filters as object,
        mediaType: mediaType as 'image' | 'audio' | 'video' | 'all',
        resultCount,
      });
    }

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Search failed', error: (error as Error).message });
  }
};

// Get details for a specific media item
export const getMediaDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, type } = req.params;

    if (!id || !type) {
      res.status(400).json({ message: 'Media ID and type are required' });
      return;
    }

    let details;
    switch (type) {
      case 'image':
        details = await openverseAPI.getImageDetails(id);
        break;
      case 'audio':
        details = await openverseAPI.getAudioDetails(id);
        break;
      default:
        res.status(400).json({ message: 'Invalid media type' });
        return;
    }

    res.json(details);
  } catch (error) {
    console.error('Get media details error:', error);
    res.status(500).json({ message: 'Failed to get media details', error: (error as Error).message });
  }
};

// Get related media for a specific item
export const getRelatedMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, type } = req.params;

    if (!id || !type) {
      res.status(400).json({ message: 'Media ID and type are required' });
      return;
    }

    let related;
    switch (type) {
      case 'image':
        related = await openverseAPI.getRelatedImages(id);
        break;
      case 'audio':
        related = await openverseAPI.getRelatedAudio(id);
        break;
      default:
        res.status(400).json({ message: 'Invalid media type' });
        return;
    }

    res.json(related);
  } catch (error) {
    console.error('Get related media error:', error);
    res.status(500).json({ message: 'Failed to get related media', error: (error as Error).message });
  }
};

// Get user's search history
export const getSearchHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { page = 1, pageSize = 20 } = req.query;
    const pageNum = Number(page);
    const pageSizeNum = Number(pageSize);

    const { count, rows } = await SearchHistory.findAndCountAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: pageSizeNum,
      offset: (pageNum - 1) * pageSizeNum,
    });

    res.json({
      total: count,
      page: pageNum,
      pageSize: pageSizeNum,
      pages: Math.ceil(count / pageSizeNum),
      history: rows,
    });
  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({ message: 'Failed to get search history', error: (error as Error).message });
  }
};

// Delete search history item
export const deleteSearchHistoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    const searchItem = await SearchHistory.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!searchItem) {
      res.status(404).json({ message: 'Search history item not found' });
      return;
    }

    await searchItem.destroy();

    res.json({ message: 'Search history item deleted' });
  } catch (error) {
    console.error('Delete search history item error:', error);
    res.status(500).json({ message: 'Failed to delete search history item', error: (error as Error).message });
  }
};

// Clear all search history for the user
export const clearSearchHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    await SearchHistory.destroy({
      where: { userId: req.user.id },
    });

    res.json({ message: 'Search history cleared' });
  } catch (error) {
    console.error('Clear search history error:', error);
    res.status(500).json({ message: 'Failed to clear search history', error: (error as Error).message });
  }
};

// Helper function to format query parameters for the Openverse API
function formatFilters(filters: any): object {
  const formattedFilters: Record<string, any> = {};

  // Map frontend filter names to Openverse API parameter names
  const filterMappings: Record<string, string> = {
    licenseType: 'license_type',
    aspectRatio: 'aspect_ratio',
    filterDead: 'filter_dead',
  };

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      // Convert boolean strings to actual booleans
      const processedValue = value === 'true' ? true : 
                            value === 'false' ? false : 
                            value;

      // Use the mapping if it exists, otherwise use the original key
      const apiKey = filterMappings[key] || key;
      formattedFilters[apiKey] = processedValue;
    }
  }

  return formattedFilters;
}