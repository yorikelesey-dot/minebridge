# Implementation Plan: MineBridges - Ultimate Minecraft Asset Aggregator

## Overview

This implementation plan breaks down the MineBridges application into incremental coding tasks. The application is a Next.js 14+ full-stack aggregator for Minecraft content from Modrinth and CurseForge APIs. Each task builds on previous work, with checkpoints to ensure stability before proceeding.

## Tasks

- [x] 1. Project setup and configuration
  - Initialize Next.js 14+ project with App Router and TypeScript
  - Install dependencies: shadcn/ui, use-debounce, framer-motion, @tanstack/react-query
  - Configure Tailwind CSS with custom theme (Zinc-950 background, Emerald-500 accents)
  - Set up .env.example with CURSEFORGE_API_KEY and MODRINTH_API_KEY placeholders
  - Configure next.config.js with image domains for Modrinth and CurseForge CDNs
  - Install @tailwindcss/typography for prose-invert styling
  - _Requirements: 10.3, 10.5_

- [x] 2. Core TypeScript interfaces and types
  - [x] 2.1 Create unified data models
    - Define ContentItem interface with all required fields
    - Define VersionFile interface for version data
    - Create discriminated union types for ModrinthProject and CurseForgeProject
    - Define SearchParams interface
    - Create lib/types.ts file for all type definitions
    - _Requirements: 2.1, 2.4_

  - [ ]* 2.2 Write property test for data model completeness
    - **Property 3: Unified result format**
    - **Validates: Requirements 2.2, 2.3, 2.4**

- [x] 3. Data transformation utilities
  - [x] 3.1 Implement transformation functions
    - Create lib/transformers.ts file
    - Implement transformModrinthProject function
    - Implement transformCurseForgeProject function
    - Implement mapModrinthCategory helper
    - Implement mapCurseForgeCategory helper
    - Implement sanitizeHTML function for CurseForge content
    - _Requirements: 2.2, 2.3_

  - [ ]* 3.2 Write property tests for transformers
    - **Property 3: Unified result format**
    - Test Modrinth transformation with random data
    - Test CurseForge transformation with random data
    - **Validates: Requirements 2.2, 2.3, 2.4**

- [x] 4. API proxy route handlers
  - [x] 4.1 Create Modrinth search proxy
    - Create app/api/modrinth/search/route.ts
    - Implement GET handler with query parameters
    - Add proper headers and caching (revalidate: 300)
    - Transform response using transformModrinthProject
    - Implement error handling with handleAPIError
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

  - [x] 4.2 Create CurseForge search proxy
    - Create app/api/curseforge/search/route.ts
    - Implement GET handler with API key from environment
    - Add proper headers and caching (revalidate: 300)
    - Transform response using transformCurseForgeProject
    - Implement error handling for missing API key
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 4.3 Create unified search endpoint
    - Create app/api/search/route.ts
    - Implement GET handler that calls both Modrinth and CurseForge proxies
    - Merge and sort results based on query parameters
    - Support source parameter (modrinth, curseforge, all)
    - Support category and sort parameters
    - _Requirements: 1.2, 1.3, 7.3, 7.4_

  - [x] 4.4 Create versions endpoint
    - Create app/api/versions/[itemId]/route.ts
    - Implement GET handler with source parameter
    - Fetch from appropriate API based on source
    - Transform version data to VersionFile format
    - _Requirements: 4.1, 4.6_

  - [ ]* 4.5 Write property tests for API proxies
    - **Property 4: Proxy request forwarding**
    - **Property 5: API key security**
    - **Property 6: Proxy error handling**
    - **Validates: Requirements 3.3, 3.4, 3.5, 3.6**

- [x] 5. Checkpoint - Verify API layer
  - Test all API routes manually using curl or Postman
  - Verify API keys are not exposed in responses
  - Ensure error handling works correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. shadcn/ui component installation
  - Install shadcn/ui CLI and initialize
  - Add Command component for search
  - Add Tabs component for category navigation
  - Add Skeleton component for loading states
  - Add Button, Card, and Badge components
  - Add Select component for version dropdowns
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 7. Search bar component
  - [x] 7.1 Implement SearchBar component
    - Create components/search-bar.tsx
    - Use use-debounce hook with 300ms delay
    - Integrate shadcn/ui Command component
    - Add loading indicator state during debounce
    - Display thin progress bar when isSearching is true
    - Emit onSearch callback with debounced value
    - _Requirements: 1.1, 1.5_

  - [ ]* 7.2 Write property test for debouncing
    - **Property 1: Debounce cancellation**
    - **Validates: Requirements 1.1, 1.5**

  - [ ]* 7.3 Write unit test for search clear
    - Test that clearing input resets to default view
    - _Requirements: 1.4_

- [x] 8. Filter panel component
  - [x] 8.1 Implement FilterPanel component
    - Create components/filter-panel.tsx
    - Add category buttons (Mod, Plugin, Shader, Resource Pack)
    - Add sort options (Popularity, Latest, Followed)
    - Update URL query parameters on selection
    - Use Emerald-500 for active filter styling
    - _Requirements: 7.1, 7.2, 7.6_

  - [ ]* 8.2 Write property test for filter application
    - **Property 11: Multi-filter application**
    - **Validates: Requirements 7.3, 7.4, 7.5, 7.6**

- [x] 9. Content card component
  - [x] 9.1 Implement ContentCard component
    - Create components/content-card.tsx
    - Use next/image for item icon with proper sizing
    - Display title, author, download count
    - Add source badge with Modrinth or CurseForge icon
    - Style with Zinc-950 background and border-white/10
    - Add click handler to open detail view
    - _Requirements: 2.5, 6.1, 6.2, 8.2_

  - [x] 9.2 Add source badge icons
    - Download or create Modrinth and CurseForge logo SVGs
    - Add to public/icons/ directory
    - Display appropriate icon based on item.source
    - _Requirements: 2.4, 8.2_



- [x] 10. Content grid with animations
  - [x] 10.1 Implement ContentGrid component
    - Create components/content-grid.tsx
    - Use Framer Motion for fade-in animations
    - Stagger animation delays (index * 0.05)
    - Display SkeletonGrid when loading
    - Use responsive grid (1 col mobile, 2 tablet, 3 desktop)
    - _Requirements: 5.4, 6.4_

  - [x] 10.2 Implement SkeletonGrid component
    - Create components/skeleton-grid.tsx
    - Use shadcn/ui Skeleton component
    - Match expected content card layout
    - _Requirements: 5.3, 5.4_

- [x] 11. Version selector component
  - [x] 11.1 Implement VersionSelector component
    - Create components/version-selector.tsx
    - Fetch versions from /api/versions/[itemId]
    - Display Game Version dropdown (first filter)
    - Filter Loader/Core options based on selected game version
    - Enable download button only when both are selected
    - Display version metadata (release date, file size, changelog)
    - Handle "no compatible version" case with message
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 11.2 Write property test for version filtering
    - **Property 7: Version filtering by game version**
    - **Validates: Requirements 4.3, 4.4**

  - [ ]* 11.3 Write unit test for no compatible version
    - Test edge case when filters don't match any versions
    - _Requirements: 4.5_

- [x] 12. Content description component
  - [x] 12.1 Implement ContentDescription component
    - Create components/content-description.tsx
    - Use dangerouslySetInnerHTML with sanitized HTML
    - Apply prose prose-invert prose-sm classes
    - Ensure CurseForge content displays correctly in dark theme
    - _Requirements: 12.3_

- [x] 13. Item detail view
  - [x] 13.1 Implement detail modal or page
    - Create app/item/[id]/page.tsx or use modal
    - Display full item information (icon, title, author, downloads, date)
    - Use ContentDescription component for description
    - Include VersionSelector component
    - Add external link to source page (Modrinth/CurseForge)
    - Display screenshots/gallery if available
    - _Requirements: 12.1, 12.2, 12.4, 12.5_

  - [ ]* 13.2 Write property test for detail view completeness
    - **Property 13: Detail view completeness**
    - **Validates: Requirements 12.2, 12.3, 12.4, 12.5**

- [x] 14. Main page layout and integration
  - [x] 14.1 Create main page
    - Create app/page.tsx
    - Add navigation bar with @MineBridges_bot button
    - Integrate SearchBar component
    - Integrate FilterPanel component
    - Integrate ContentGrid component
    - Set up React Query for data fetching
    - Handle URL query parameters for filters
    - Apply Deep Dark theme styling
    - _Requirements: 7.6, 8.1, 8.3, 9.1, 9.2, 9.3, 9.5_

  - [x] 14.2 Implement URL state management
    - Use Next.js useSearchParams and useRouter
    - Sync filter state with URL query parameters
    - Enable browser back/forward navigation
    - _Requirements: 7.6_

- [ ] 15. Error handling and user feedback
  - [ ] 15.1 Create error handling utilities
    - Create lib/errors.ts
    - Implement APIError class
    - Implement handleAPIError function
    - Define errorMessages object with user-friendly messages
    - _Requirements: 11.1, 11.5_

  - [ ] 15.2 Add error boundary
    - Create components/error-boundary.tsx
    - Implement React error boundary
    - Display user-friendly error UI
    - Log errors to console
    - _Requirements: 11.1_

  - [ ] 15.3 Add error states to components
    - Add error handling to SearchBar
    - Add "No results found" message to ContentGrid
    - Add offline detection and message
    - Add rate limit error handling
    - _Requirements: 11.2, 11.3, 11.4_

  - [ ]* 15.4 Write property test for error handling
    - **Property 12: API failure feedback**
    - **Validates: Requirements 11.1, 11.5**

- [ ] 16. Checkpoint - End-to-end functionality test
  - Test complete search flow from input to results
  - Test filter and sort functionality
  - Test version selection and download flow
  - Verify error handling works correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Performance optimizations
  - [ ] 17.1 Implement caching
    - Add cache headers to API routes
    - Configure React Query cache times
    - _Requirements: 6.3_

  - [ ] 17.2 Add lazy loading
    - Implement intersection observer for content grid
    - Load items as they enter viewport
    - _Requirements: 6.4_

  - [ ]* 17.3 Write property tests for performance
    - **Property 9: API response caching**
    - **Property 10: Lazy loading**
    - **Validates: Requirements 6.3, 6.4**

- [ ] 18. Documentation and deployment prep
  - [ ] 18.1 Create README
    - Document project setup and installation
    - Add API key setup instructions
    - Include Vercel deployment guide
    - Add development commands
    - _Requirements: 10.4_

  - [ ] 18.2 Verify deployment configuration
    - Check next.config.js is complete
    - Verify .env.example has all required variables
    - Test build process locally
    - _Requirements: 10.2, 10.3, 10.5_

- [ ] 19. Final checkpoint - Production readiness
  - Run full test suite
  - Verify all environment variables are documented
  - Test production build locally
  - Verify image optimization works
  - Check that all API keys are secure
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- All API requests must go through proxy routes to protect API keys
- Use TypeScript strict mode for type safety
- Follow Next.js 14 App Router best practices
