// server/src/services/openverseService.ts
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { throttle } from 'lodash';

// Openverse API base URL
const API_BASE_URL = 'https://api.openverse.org/v1';

// Client ID and secret from environment variables
const CLIENT_ID = process.env.OPENVERSE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.OPENVERSE_CLIENT_SECRET || '';

// API request timeout
const TIMEOUT = 10000; // 10 seconds

// Interface for search parameters
export interface SearchParams {
  q: string;
  page?: number;
  page_size?: number;
  license?: string;
  license_type?: string;
  categories?: string;
  extension?: string;
  size?: string;
  aspect_ratio?: string;
  source?: string;
  creator?: string;
  tags?: string;
  title?: string;
  filter_dead?: boolean;
}

// Interface for search results
export interface SearchResult<T> {
  result_count: number;
  page_count: number;
  page_size: number;
  page: number;
  results: T[];
}

// Interface for image result
export interface ImageResult {
  id: string;
  title: string;
  creator: string;
  creator_url: string;
  tags: { name: string }[];
  url: string;
  thumbnail: string;
  source: string;
  license: string;
  license_version: string;
  license_url: string;
  foreign_landing_url: string;
  detail_url: string;
  related_url: string;
  width: number;
  height: number;
  attribution: string;
  filesize: number;
  filetype: string;
}

// Interface for audio result
export interface AudioResult {
  id: string;
  title: string;
  creator: string;
  creator_url: string;
  tags: { name: string }[];
  url: string;
  thumbnail: string;
  source: string;
  license: string;
  license_version: string;
  license_url: string;
  foreign_landing_url: string;
  detail_url: string;
  related_url: string;
  duration: number;
  bit_rate: number;
  sample_rate: number;
  genres: string[];
  waveform: string;
  attribution: string;
  filesize: number;
  filetype: string;
}

// OpenverseAPI class
export class OpenverseAPI {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  
  // Throttled API call to respect rate limits
  private throttledRequest = throttle(
    async <T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
      return axios.request<T>(config);
    },
    1000, // 1 request per second
    { leading: true, trailing: true }
  );

  // Get access token
  private async getAccessToken(): Promise<string> {
    // Return cached token if it's still valid
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth_tokens/token/`,
        {
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: 'client_credentials',
        },
        {
          timeout: TIMEOUT,
        }
      );

      this.accessToken = response.data.access_token;
      // Set token expiry (subtract 5 minutes for safety)
      this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000) - 300000;
      
      return this.accessToken;
    } catch (error) {
      console.error('Failed to obtain Openverse API token:', error);
      throw new Error('Authentication with Openverse API failed');
    }
  }

  // Create authenticated request config
  private async createAuthenticatedConfig(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    const token = await this.getAccessToken();
    
    return {
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      },
    };
  }

  // Make an API request with authentication
  private async makeRequest<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const authConfig = await this.createAuthenticatedConfig(config);
      const response = await this.throttledRequest<T>(authConfig);
      return response.data;
    } catch (error: any) {
      // Handle API errors
      if (error.response) {
        const status = error.response.status;
        
        if (status === 401 || status === 403) {
          // Clear token and retry once
          this.accessToken = null;
          const authConfig = await this.createAuthenticatedConfig(config);
          const response = await this.throttledRequest<T>(authConfig);
          return response.data;
        }
        
        if (error.response.data && error.response.data.detail) {
          throw new Error(`Openverse API error (${status}): ${error.response.data.detail}`);
        }
      }
      
      throw error;
    }
  }

  // Search for images
  public async searchImages(params: SearchParams): Promise<SearchResult<ImageResult>> {
    return this.makeRequest<SearchResult<ImageResult>>({
      method: 'GET',
      url: `${API_BASE_URL}/images/`,
      params,
      timeout: TIMEOUT,
    });
  }

  // Search for audio
  public async searchAudio(params: SearchParams): Promise<SearchResult<AudioResult>> {
    return this.makeRequest<SearchResult<AudioResult>>({
      method: 'GET',
      url: `${API_BASE_URL}/audio/`,
      params,
      timeout: TIMEOUT,
    });
  }

  // Get image details
  public async getImageDetails(id: string): Promise<ImageResult> {
    return this.makeRequest<ImageResult>({
      method: 'GET',
      url: `${API_BASE_URL}/images/${id}/`,
      timeout: TIMEOUT,
    });
  }

  // Get audio details
  public async getAudioDetails(id: string): Promise<AudioResult> {
    return this.makeRequest<AudioResult>({
      method: 'GET',
      url: `${API_BASE_URL}/audio/${id}/`,
      timeout: TIMEOUT,
    });
  }

  // Get related images
  public async getRelatedImages(id: string): Promise<SearchResult<ImageResult>> {
    return this.makeRequest<SearchResult<ImageResult>>({
      method: 'GET',
      url: `${API_BASE_URL}/images/${id}/related/`,
      timeout: TIMEOUT,
    });
  }

  // Get related audio
  public async getRelatedAudio(id: string): Promise<SearchResult<AudioResult>> {
    return this.makeRequest<SearchResult<AudioResult>>({
      method: 'GET',
      url: `${API_BASE_URL}/audio/${id}/related/`,
      timeout: TIMEOUT,
    });
  }

  // Get stats about available media
  public async getStats(): Promise<any> {
    return this.makeRequest<any>({
      method: 'GET',
      url: `${API_BASE_URL}/stats/`,
      timeout: TIMEOUT,
    });
  }
}

// Export singleton instance
export const openverseAPI = new OpenverseAPI();
export default openverseAPI;