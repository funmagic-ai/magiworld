 **Project Target**

Magiworld AI Platform Development Specification
 
**1. Core Architecture Principles**
Tech Stack: Next.js 16.1.1 (App Router), Payload CMS, Tailwind CSS v4,shadcn ui.
-monorepo project
-use turborepo and pnpm  to create monorepo project 

-Configuration-Driven: The frontend page.tsx must not hard-code business logic. UI rendering and algorithm scheduling are determined by the toolType returned from Payload CMS.

- MUST design for Responsible layout
-
Component Registry: Establish a one-to-one mapping between toolType and React components.

-Dynamic Imports: Use next/dynamic to load tool-specific interfaces only when needed to optimize performance.

**2. Data Model Design (Payload CMS)**
-Implement the following Collections and Globals:

A. Global: HomeConfig (Marketing Control)
mainBanners: Array (Max 3). Fields: image, title, link (Relationship to Tools).

sideBanners: Array (Fixed 2). Fields: image, title, link (Relationship to Tools).

B. Collection: Tools & Categories
Categories: name, slug, icon.

Tools:

Base: title, slug, category (Relational), thumbnail.

Type Dispatcher: toolType (Select: stylize, edit, 3d_gen, crystal_engrave).

Conditional Logic: Show promptTemplate for stylize types; show configJson for 3D/Edit types.

C. Collection: Tasks (Unified Asset Model)
Purpose: To unify diverse outputs (2D images, 3D models, fabrication parameters) into a single management system.

Fields:

user: Relationship to Users.

parentTool: Relationship to Tools.

inputParams: JSON (Stores prompts, seeds, or uploaded image refs).

outputData: JSON (Stores previewUrl, downloadUrl, and metadata like dimensions or point cloud density).

status: pending | processing | success | failed.

**3. Module Requirements**
Module 1: Explore (Homepage)
Responsive Hero Layout:

Desktop (lg): Use a 12-column grid. The MainCarousel (sourced from mainBanners) spans 8 columns. The two SideBanners (sourced from sideBanners) occupy the remaining 4 columns and are stacked vertically to match the height of the main carousel.

Mobile: Stacked layout. The MainCarousel takes full width on top. Below it, the two SideBanners are displayed side-by-side in a 2-column grid (grid-cols-2).

Tool Discovery: Display tool cards grouped by category, showing thumbnail, title, and last updated time.

Module 2: Studio (Dynamic Workspace)
Dynamic Routing: /[toolTypeSlug]/[toolSlug].

Interface Injection: Fetch tool data by slug, look up the toolType in the TOOL_COMPONENTS registry, and dynamically render the corresponding interface (e.g., StylizeInterface).

Interaction: Support search, filtering, and masonry/waterfall layout for the tool list.

Module 3: Assets (Personal Library)
Unified Renderer: Iterate through the Tasks collection. Use a "Polymorphic Viewer" to render the asset based on outputType (e.g., NextImage for images, <model-viewer> for 3D GLB files).

"Re-create" Workflow: Allow users to click an asset to return to the original Studio tool with inputParams pre-filled for fine-tuning.

**4. Technical Constraints**
Safety: All AI API calls must be proxied via Next.js API Routes to protect backend API Keys.

Performance: Implement aggressive code splitting for tool interfaces.

Scalability: The Task schema must remain flexible (JSON-based) to support future fabrication devices without database migrations.
**5.monorepo Apps**
-web,pls use "pnpm dlx shadcn@latest create --preset 
"https://ui.shadcn.com/init?base=base&style=nova&baseColor=neutral&theme=neutral&iconLibrary=hugeicons&font=inter&menuAccent=subtle&menuC
olor=default&radius=default&template=next" --template next" to create, and always use shadcn ui component.
-cms,  payload cms project, pls use "npxcreate-payload-app", and remember we use postgresql as our db
**6.Database url**
postgresql://postgres:88665575@localhost:9000/magi-db

**7.Internationalization**
we use latest next-intl to support  Internationalization, at this stage we only need english,Japanese,portuguese and Chinese.use https://next-intl.dev/docs/ as your search to get information 
**8.MCP Use**
Always remember to use registered MCP servers to get information before web search

**9.Payload CMS**
usenpx create-payload-app to create and consider https://payloadcms.com/docs as your search source since it does not have MCP server.
**Layout Reference for Header**
refer to reference/layout.png, and more layout or component layout i will put picture here for your reference.