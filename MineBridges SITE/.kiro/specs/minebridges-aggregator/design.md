# Design Document: MineBridges - Ultimate Minecraft Asset Aggregator

## Overview

MineBridges is a full-stack Next.js 14+ application using the App Router architecture that aggregates Minecraft content from Modrinth and CurseForge APIs. The application provides a unified search interface with debounced input, cross-source data normalization, and complex version filtering for precise mod/plugin compatibility matching.

The architecture follows a three-tier pattern:
1. **Client Layer**: React components using shadcn/ui with optimized rendering via next/image and smooth animations via Framer Motion
2. **API Proxy Layer**: Next.js Route Handlers that securely forward requests to external APIs
3. **External APIs**: Modrinth and CurseForge services

Key technical decisions:
- Use `use-debounce` hook for search input to prevent API rate-limiting
- Implement TypeScript discriminated unions for type-safe API response handling
- Use URL query parameters for filter state to enable sharing and browser navigation
- Leverage Next.js 14 Server Components where possible for improved performance
- Implement optimistic UI updates with React Query for better perceived performance
- Use Framer Motion for smooth fade-in animations on content cards
- Sanitize CurseForge HTML content and use Tailwind Typography's `prose-invert` for dark theme compatibility
- Display source badges with icons (Modrinth/CurseForge logos) for visual trust indicators
- Show loading indicator in search bar during debounce period for better UX feedback

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Search Bar   │  │ Filter Panel │  │ Content Grid │      │
│  │ (debounced)  │  │ (categories) │  │ (items)      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│           │                │                  │              │
│           └────────────────┴──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Proxy Layer (Next.js)                 │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │ /api/modrinth/*  │         │ /api/curseforge/*│          │
│  │ Route Handlers   │         │ Route Handlers   │          │
│  └──────────────────┘         └──────────────────┘          │
│           │                            │                     │
└───────────┼────────────────────────────┼─────────────────────┘
            │                            │
            ▼                            ▼
┌──────────────────┐         ┌──────────────────┐
│  Modrinth API    │         │  CurseForge API  │
│  (External)      │         │  (External)      │
└──────────────────┘         └──────────────────┘
```

### Data Flow

1. **Search Flow**:
   - User types → Debounce (300ms) → Client state update
   - Client calls `/api/search?q={query}&source={modrinth|curseforge}`
   - Proxy handler forwards to external API with authentication
   - Response transformed to unified format → Returned to client
   - Client renders using unified Content_Item interface

2. **Version Selection Flow**:
   - User clicks item → Fetch `/api/versions/{itemId}?source={source}`
   - Display Game_Version dropdown (e.g., 1.20.1, 1.19.4)
   - User selects version → Filter Loader/Core options
   - User selects Loader → Enable download button
   - Download button links to the specific Version_File

3. **Filter Flow**:
   - User changes filter → Update URL query params
   - URL change triggers data refetch with new parameters
   - Results update with filtered/sorted content

## Components and Interfaces

### Core TypeScript Interfaces

```typescript
// Unified content item interface
interface ContentItem {
  id: string;
  source: 'modrinth' | 'curseforge';
  title: string;
  description: string;
  iconUrl: string;
  author: string;
  downloadCount: number;
  category: 'mod' | 'plugin' | 'shader' | 'resourcepack';
  lastUpdated: Date;
  sourceUrl: string;
}

// Version file interface
interface VersionFile {
  id: string;
  gameVersions: string[];
  loaders: string[];
  fileName: string;
  downloadUrl: string;
  fileSize: number;
  releaseDate: Date;
  changelog?: string;
}

// API response types (discriminated unions)
type ModrinthProject = {
  source: 'modrinth';
  project_id: string;
  title: string;
  description: string;
  icon_url: string;
  author: string;
  downloads: number;
  project_type: string;
  date_modified: string;
  // ... other Modrinth-specific fields
};

type CurseForgeProject = {
  source: 'curseforge';
  id: number;
  name: string;
  summary: string;
  logo: { url: string };
  authors: Array<{ name: string }>;
  downloadCount: number;
  classId: number;
  dateModified: string;
  // ... other CurseForge-specific fields
};

type APIProject = ModrinthProject | CurseForgeProject;

// Search parameters
interface SearchParams {
  query: string;
  category?: 'mod' | 'plugin' | 'shader' | 'resourcepack';
  sort?: 'popularity' | 'latest' | 'followed';
  source?: 'modrinth' | 'curseforge' | 'all';
}
```

### Component Structure

#### 1. Search Bar Component (`components/search-bar.tsx`)

```typescript
'use client';

import { useDebounce } from 'use-debounce';
import { Command } from '@/components/ui/command';

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialValue?: string;
}

export function SearchBar({ onSearch, initialValue = '' }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const [isSearching, setIsSearching] = useState(false);
  
  useEffect(() => {
    if (searchTerm !== debouncedSearch) {
      setIsSearching(true);
    }
  }, [searchTerm, debouncedSearch]);
  
  useEffect(() => {
    onSearch(debouncedSearch);
    setIsSearching(false);
  }, [debouncedSearch, onSearch]);
  
  // Implementation uses Command component from shadcn/ui
  // Handles input changes and debouncing
  // Displays loading indicator (thin progress bar) when isSearching is true
  // Loading indicator provides visual feedback during debounce period
}
```

#### 2. Filter Panel Component (`components/filter-panel.tsx`)

```typescript
interface FilterPanelProps {
  selectedCategory?: string;
  selectedSort?: string;
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: string) => void;
}

export function FilterPanel({
  selectedCategory,
  selectedSort,
  onCategoryChange,
  onSortChange
}: FilterPanelProps) {
  // Renders category buttons (Mod, Plugin, Shader, Resource Pack)
  // Renders sort options (Popularity, Latest, Followed)
  // Updates URL query params on selection
}
```

#### 3. Content Grid Component (`components/content-grid.tsx`)

```typescript
import { motion } from 'framer-motion';

interface ContentGridProps {
  items: ContentItem[];
  isLoading: boolean;
}

export function ContentGrid({ items, isLoading }: ContentGridProps) {
  if (isLoading) {
    return <SkeletonGrid />;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <ContentCard item={item} />
        </motion.div>
      ))}
    </div>
  );
}
```

#### 4. Content Card Component (`components/content-card.tsx`)

```typescript
interface ContentCardProps {
  item: ContentItem;
}

export function ContentCard({ item }: ContentCardProps) {
  // Displays item icon using next/image
  // Shows title, author, download count
  // Displays source badge with icon (Modrinth/CurseForge logo)
  // Source badge should include small icon for visual trust indicator
  // Click handler opens detail modal/page
  // Implements fade-in animation using Framer Motion
}
```

#### 5. Version Selector Component (`components/version-selector.tsx`)

```typescript
interface VersionSelectorProps {
  itemId: string;
  source: 'modrinth' | 'curseforge';
  onVersionSelect: (file: VersionFile) => void;
}

export function VersionSelector({ itemId, source, onVersionSelect }: VersionSelectorProps) {
  const [selectedGameVersion, setSelectedGameVersion] = useState<string>();
  const [selectedLoader, setSelectedLoader] = useState<string>();
  const [versions, setVersions] = useState<VersionFile[]>([]);
  
  // Step 1: Fetch all versions for the item
  // Step 2: Display Game Version dropdown
  // Step 3: Filter and display Loader/Core options based on selected game version
  // Step 4: Enable download button when both are selected
}
```

### API Route Handlers

#### 1. Search Endpoint (`app/api/search/route.ts`)

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const source = searchParams.get('source') || 'all';
  const category = searchParams.get('category');
  const sort = searchParams.get('sort');
  
  // Fetch from Modrinth and/or CurseForge based on source parameter
  // Transform responses to unified ContentItem format
  // Merge and sort results
  // Return JSON response
}
```

#### 2. Modrinth Proxy (`app/api/modrinth/search/route.ts`)

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  
  const response = await fetch(
    `https://api.modrinth.com/v2/search?query=${query}`,
    {
      headers: {
        'User-Agent': 'MineBridges/1.0',
        // Modrinth doesn't require API key for search, but good practice
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    }
  );
  
  const data = await response.json();
  return Response.json(transformModrinthResponse(data));
}
```

#### 3. CurseForge Proxy (`app/api/curseforge/search/route.ts`)

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  
  const apiKey = process.env.CURSEFORGE_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'CurseForge API key not configured' },
      { status: 500 }
    );
  }
  
  const response = await fetch(
    `https://api.curseforge.com/v1/mods/search?gameId=432&searchFilter=${query}`,
    {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }
    }
  );
  
  const data = await response.json();
  return Response.json(transformCurseForgeResponse(data));
}
```

#### 4. Versions Endpoint (`app/api/versions/[itemId]/route.ts`)

```typescript
export async function GET(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source');
  
  if (source === 'modrinth') {
    // Fetch from Modrinth versions API
    const response = await fetch(
      `https://api.modrinth.com/v2/project/${params.itemId}/version`
    );
    const data = await response.json();
    return Response.json(transformModrinthVersions(data));
  } else if (source === 'curseforge') {
    // Fetch from CurseForge files API
    const apiKey = process.env.CURSEFORGE_API_KEY;
    const response = await fetch(
      `https://api.curseforge.com/v1/mods/${params.itemId}/files`,
      {
        headers: { 'x-api-key': apiKey! }
      }
    );
    const data = await response.json();
    return Response.json(transformCurseForgeFiles(data));
  }
  
  return Response.json({ error: 'Invalid source' }, { status: 400 });
}
```

### Data Transformation Functions

```typescript
// Transform Modrinth project to unified format
function transformModrinthProject(project: ModrinthProject): ContentItem {
  return {
    id: project.project_id,
    source: 'modrinth',
    title: project.title,
    description: project.description,
    iconUrl: project.icon_url || '/default-icon.png',
    author: project.author,
    downloadCount: project.downloads,
    category: mapModrinthCategory(project.project_type),
    lastUpdated: new Date(project.date_modified),
    sourceUrl: `https://modrinth.com/mod/${project.project_id}`
  };
}

// Transform CurseForge mod to unified format
function transformCurseForgeProject(mod: CurseForgeProject): ContentItem {
  return {
    id: mod.id.toString(),
    source: 'curseforge',
    title: mod.name,
    description: sanitizeHTML(mod.summary), // Sanitize potentially malformed HTML
    iconUrl: mod.logo?.url || '/default-icon.png',
    author: mod.authors[0]?.name || 'Unknown',
    downloadCount: mod.downloadCount,
    category: mapCurseForgeCategory(mod.classId),
    lastUpdated: new Date(mod.dateModified),
    sourceUrl: `https://www.curseforge.com/minecraft/mc-mods/${mod.id}`
  };
}

// Sanitize HTML content from CurseForge
// CurseForge descriptions often contain malformed HTML with inline styles
function sanitizeHTML(html: string): string {
  // Remove inline styles that conflict with dark theme
  // Strip dangerous tags while preserving basic formatting
  // This is a placeholder - actual implementation should use a library like DOMPurify
  return html
    .replace(/style="[^"]*"/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
}

// Map Modrinth project types to unified categories
function mapModrinthCategory(projectType: string): ContentItem['category'] {
  const mapping: Record<string, ContentItem['category']> = {
    'mod': 'mod',
    'plugin': 'plugin',
    'shader': 'shader',
    'resourcepack': 'resourcepack',
    'modpack': 'mod' // Treat modpacks as mods for simplicity
  };
  return mapping[projectType] || 'mod';
}

// Map CurseForge class IDs to unified categories
function mapCurseForgeCategory(classId: number): ContentItem['category'] {
  const mapping: Record<number, ContentItem['category']> = {
    6: 'mod',
    5: 'plugin',
    6552: 'shader',
    12: 'resourcepack'
  };
  return mapping[classId] || 'mod';
}
```

### Content Display Styling

For displaying mod descriptions, especially from CurseForge which may contain malformed HTML:

```typescript
// Component for rendering sanitized HTML content
export function ContentDescription({ html }: { html: string }) {
  return (
    <div 
      className="prose prose-invert prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: sanitizeHTML(html) }}
    />
  );
}
```

The `prose-invert` class from Tailwind Typography automatically adapts any HTML content to the dark theme, ensuring:
- Text colors are appropriate for dark backgrounds
- Links are visible and properly styled
- Tables and other elements don't clash with the Zinc-950 background
- Inline styles from CurseForge are overridden by theme-appropriate styles

## Data Models

### Client-Side State Management

The application uses a combination of URL state and React Query for state management:

```typescript
// URL state for filters (enables sharing and browser navigation)
interface URLState {
  q?: string;           // search query
  category?: string;    // mod, plugin, shader, resourcepack
  sort?: string;        // popularity, latest, followed
  source?: string;      // modrinth, curseforge, all
}

// React Query keys for cache management
const queryKeys = {
  search: (params: SearchParams) => ['search', params],
  versions: (itemId: string, source: string) => ['versions', itemId, source],
  itemDetail: (itemId: string, source: string) => ['item', itemId, source]
};
```

### API Response Caching

```typescript
// Next.js Route Handler caching configuration
const cacheConfig = {
  search: { revalidate: 300 },      // 5 minutes
  versions: { revalidate: 3600 },   // 1 hour
  itemDetail: { revalidate: 1800 }  // 30 minutes
};
```

### Database Schema (Optional - Future Enhancement)

For tracking user favorites and followed items (not in MVP):

```typescript
interface UserFavorite {
  userId: string;
  itemId: string;
  source: 'modrinth' | 'curseforge';
  createdAt: Date;
}

interface UserFollow {
  userId: string;
  itemId: string;
  source: 'modrinth' | 'curseforge';
  notifyOnUpdate: boolean;
  createdAt: Date;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Search and Debouncing Properties

Property 1: Debounce cancellation
*For any* sequence of rapid keystrokes within the 300ms debounce period, only the final search query should trigger an API request, and all previous pending requests should be cancelled.
**Validates: Requirements 1.1, 1.5**

Property 2: Search request routing
*For any* completed debounce period with a non-empty query, the search request should be routed through the appropriate Proxy_Handler (never directly to external APIs).
**Validates: Requirements 1.2**

Property 3: Unified result format
*For any* search results received from either Modrinth or CurseForge, all items should be transformed to match the unified ContentItem interface with all required fields (id, source, title, description, iconUrl, author, downloadCount, category, lastUpdated, sourceUrl).
**Validates: Requirements 2.2, 2.3, 2.4**

### API Proxy Properties

Property 4: Proxy request forwarding
*For any* client request to a Proxy_Handler, the request should be forwarded to the appropriate external API with proper authentication headers, and the response should be returned to the client.
**Validates: Requirements 3.3, 3.4**

Property 5: API key security
*For any* API response or client-accessible code, API keys should never be exposed or included in the response payload.
**Validates: Requirements 3.5**

Property 6: Proxy error handling
*For any* failed external API request, the Proxy_Handler should return an appropriate HTTP error response with a status code and error message.
**Validates: Requirements 3.6**

### Version Selection Properties

Property 7: Version filtering by game version
*For any* set of version files and selected game version, the available Loader/Core options should only include those that are compatible with the selected game version, and the download button should only be enabled when both game version and loader are selected.
**Validates: Requirements 4.3, 4.4**

Property 8: Version metadata completeness
*For any* displayed version file, the UI should include release date, file size, and changelog link (if available).
**Validates: Requirements 4.6**

### Performance Properties

Property 9: API response caching
*For any* API route handler response, appropriate cache-control headers should be included to enable caching.
**Validates: Requirements 6.3**

Property 10: Lazy loading
*For any* content items outside the initial viewport, they should not be loaded until they enter or are near the viewport.
**Validates: Requirements 6.4**

### Filter and Sort Properties

Property 11: Multi-filter application
*For any* combination of active filters (category, sort, source), all filters should be applied simultaneously to produce the correct filtered and sorted result set, and the URL query parameters should reflect the current filter state.
**Validates: Requirements 7.3, 7.4, 7.5, 7.6**

### Error Handling Properties

Property 12: API failure feedback
*For any* failed API request, a user-friendly error message should be displayed to the user, and detailed error information should be logged to the console.
**Validates: Requirements 11.1, 11.5**

### Detail View Properties

Property 13: Detail view completeness
*For any* content item detail view, it should display all required fields (icon, title, author, download count, last updated date, description, external source link) and conditionally display screenshots if available from the API.
**Validates: Requirements 12.2, 12.3, 12.4, 12.5**

## Error Handling

### Error Categories

1. **Network Errors**
   - Connection failures
   - Timeout errors
   - DNS resolution failures

2. **API Errors**
   - 4xx client errors (bad request, not found, unauthorized)
   - 5xx server errors (internal server error, service unavailable)
   - Rate limiting (429 Too Many Requests)

3. **Data Validation Errors**
   - Malformed API responses
   - Missing required fields
   - Type mismatches

4. **Client-Side Errors**
   - Invalid user input
   - Browser compatibility issues
   - JavaScript runtime errors

### Error Handling Strategy

```typescript
// Centralized error handler for API routes
export function handleAPIError(error: unknown): Response {
  console.error('API Error:', error);
  
  if (error instanceof APIError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }
  
  if (error instanceof TypeError) {
    return Response.json(
      { error: 'Invalid data format received from external API' },
      { status: 502 }
    );
  }
  
  return Response.json(
    { error: 'An unexpected error occurred' },
    { status: 500 }
  );
}

// Custom error class for API errors
class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Client-side error boundary
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error:', error, errorInfo);
  }
  
  render() {
    if (this.state?.hasError) {
      return (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <p>Please refresh the page or try again later.</p>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

### User-Facing Error Messages

```typescript
const errorMessages = {
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
  API_TIMEOUT: 'The request took too long. Please try again.',
  RATE_LIMIT: 'Too many requests. Please wait a moment before searching again.',
  NOT_FOUND: 'The requested item could not be found.',
  SERVER_ERROR: 'The server encountered an error. Please try again later.',
  NO_RESULTS: 'No results found. Try different search terms or filters.',
  INVALID_VERSION: 'No compatible version found for your selection.',
  API_KEY_MISSING: 'Service configuration error. Please contact support.'
};
```

### Retry Logic

```typescript
// Exponential backoff retry for transient failures
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      // Don't retry client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        return response;
      }
      
      // Retry server errors (5xx)
      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      
      // Wait before retrying (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
      }
    }
  }
  
  throw lastError!;
}
```

## Testing Strategy

### Dual Testing Approach

The MineBridges application requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

Both testing approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across a wide range of inputs.

### Property-Based Testing Configuration

**Library Selection**: Use `fast-check` for TypeScript/JavaScript property-based testing.

**Configuration**:
- Each property test must run a minimum of 100 iterations
- Each test must include a comment tag referencing the design document property
- Tag format: `// Feature: minebridges-aggregator, Property {number}: {property_text}`

**Example Property Test**:

```typescript
import fc from 'fast-check';

// Feature: minebridges-aggregator, Property 3: Unified result format
describe('Data Transformation Properties', () => {
  it('should transform all Modrinth responses to unified ContentItem format', () => {
    fc.assert(
      fc.property(
        modrinthProjectArbitrary(),
        (modrinthProject) => {
          const result = transformModrinthProject(modrinthProject);
          
          // Verify all required fields are present
          expect(result).toHaveProperty('id');
          expect(result).toHaveProperty('source', 'modrinth');
          expect(result).toHaveProperty('title');
          expect(result).toHaveProperty('description');
          expect(result).toHaveProperty('iconUrl');
          expect(result).toHaveProperty('author');
          expect(result).toHaveProperty('downloadCount');
          expect(result).toHaveProperty('category');
          expect(result).toHaveProperty('lastUpdated');
          expect(result).toHaveProperty('sourceUrl');
          
          // Verify types
          expect(typeof result.id).toBe('string');
          expect(typeof result.downloadCount).toBe('number');
          expect(result.lastUpdated).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing Strategy

**Focus Areas**:
1. **Specific Examples**: Test known good inputs and expected outputs
2. **Edge Cases**: Empty results, missing optional fields, malformed data
3. **Error Conditions**: API failures, network errors, invalid inputs
4. **Integration Points**: Component interactions, API route handlers

**Example Unit Test**:

```typescript
describe('Search Bar Component', () => {
  it('should reset to default view when search is cleared', async () => {
    const onSearch = jest.fn();
    const { getByRole } = render(<SearchBar onSearch={onSearch} />);
    
    const input = getByRole('textbox');
    
    // Type and then clear
    fireEvent.change(input, { target: { value: 'fabric' } });
    fireEvent.change(input, { target: { value: '' } });
    
    // Wait for debounce
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('');
    }, { timeout: 400 });
  });
  
  it('should display error message when no results found', () => {
    const { getByText } = render(
      <ContentGrid items={[]} isLoading={false} />
    );
    
    expect(getByText(/no results found/i)).toBeInTheDocument();
  });
});
```

### Test Generators (Arbitraries)

For property-based testing, create generators for domain objects:

```typescript
// Arbitrary for Modrinth projects
function modrinthProjectArbitrary(): fc.Arbitrary<ModrinthProject> {
  return fc.record({
    source: fc.constant('modrinth' as const),
    project_id: fc.hexaString({ minLength: 8, maxLength: 16 }),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.string({ minLength: 0, maxLength: 500 }),
    icon_url: fc.webUrl(),
    author: fc.string({ minLength: 1, maxLength: 50 }),
    downloads: fc.nat(),
    project_type: fc.constantFrom('mod', 'plugin', 'shader', 'resourcepack'),
    date_modified: fc.date().map(d => d.toISOString())
  });
}

// Arbitrary for CurseForge projects
function curseForgeProjectArbitrary(): fc.Arbitrary<CurseForgeProject> {
  return fc.record({
    source: fc.constant('curseforge' as const),
    id: fc.nat(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    summary: fc.string({ minLength: 0, maxLength: 500 }),
    logo: fc.record({ url: fc.webUrl() }),
    authors: fc.array(fc.record({ name: fc.string() }), { minLength: 1 }),
    downloadCount: fc.nat(),
    classId: fc.constantFrom(6, 5, 6552, 12),
    dateModified: fc.date().map(d => d.toISOString())
  });
}

// Arbitrary for version files
function versionFileArbitrary(): fc.Arbitrary<VersionFile> {
  return fc.record({
    id: fc.hexaString({ minLength: 8, maxLength: 16 }),
    gameVersions: fc.array(
      fc.constantFrom('1.20.1', '1.19.4', '1.18.2', '1.17.1'),
      { minLength: 1, maxLength: 3 }
    ),
    loaders: fc.array(
      fc.constantFrom('fabric', 'forge', 'quilt', 'paper'),
      { minLength: 1, maxLength: 2 }
    ),
    fileName: fc.string({ minLength: 5, maxLength: 50 }).map(s => `${s}.jar`),
    downloadUrl: fc.webUrl(),
    fileSize: fc.nat({ max: 100000000 }), // Max 100MB
    releaseDate: fc.date(),
    changelog: fc.option(fc.string({ maxLength: 1000 }))
  });
}
```

### Testing Coverage Goals

- **Unit Test Coverage**: Minimum 80% code coverage
- **Property Test Coverage**: All correctness properties from design document
- **Integration Test Coverage**: All API routes and critical user flows
- **E2E Test Coverage**: Core user journeys (search, filter, version selection, download)

### Continuous Integration

```yaml
# Example GitHub Actions workflow
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:property
      - run: npm run test:integration
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Deployment and Configuration

### Environment Variables

Required environment variables for deployment:

```bash
# .env.example
# CurseForge API Key (required)
# Get your key from: https://console.curseforge.com/
CURSEFORGE_API_KEY=your_curseforge_api_key_here

# Modrinth API Key (optional, but recommended for higher rate limits)
# Get your key from: https://modrinth.com/settings/account
MODRINTH_API_KEY=your_modrinth_api_key_here

# Next.js Configuration
NEXT_PUBLIC_APP_URL=https://minebridges.vercel.app
```

### Next.js Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.modrinth.com',
        pathname: '/data/**',
      },
      {
        protocol: 'https',
        hostname: 'media.forgecdn.net',
        pathname: '/avatars/**',
      },
      {
        protocol: 'https',
        hostname: 'edge.forgecdn.net',
        pathname: '/**',
      },
    ],
  },
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  // Optimize production builds
  swcMinify: true,
};

module.exports = nextConfig;
```

### Vercel Deployment Configuration

```json
// vercel.json (optional, for custom configuration)
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "CURSEFORGE_API_KEY": "@curseforge-api-key",
    "MODRINTH_API_KEY": "@modrinth-api-key"
  }
}
```

### Deployment Checklist

1. **Environment Setup**:
   - Add `CURSEFORGE_API_KEY` to Vercel environment variables
   - Add `MODRINTH_API_KEY` to Vercel environment variables (optional)
   - Set `NEXT_PUBLIC_APP_URL` to production URL

2. **Build Verification**:
   - Run `npm run build` locally to verify no build errors
   - Check that all TypeScript types are correct
   - Verify all environment variables are properly referenced

3. **Performance Optimization**:
   - Ensure all images use `next/image` component
   - Verify API routes have appropriate caching headers
   - Check that bundle size is optimized (use `npm run analyze` if configured)

4. **Security Review**:
   - Confirm API keys are never exposed to client
   - Verify all external API calls go through proxy routes
   - Check that CORS is properly configured

5. **Monitoring Setup**:
   - Configure Vercel Analytics
   - Set up error tracking (e.g., Sentry)
   - Enable Web Vitals monitoring

### Post-Deployment Verification

After deployment, verify:
- Search functionality works with debouncing
- Both Modrinth and CurseForge content loads correctly
- Version selection and filtering works properly
- Images load from both CDNs
- Error handling displays appropriate messages
- Performance metrics meet targets (Lighthouse score 90+)