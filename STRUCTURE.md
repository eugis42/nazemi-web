# NaZemi Multisite Structure

This document is in English, but I want the entire admin panel to be in Czech. In some cases I will use Czech names for collections etc. so you know how to name them.

The following is the structure of the admin panel. Suggest the best practice to execute each part.

# Sites

The whole app is a multi-site setup, where the sites share a visual system, but have a specific colour palette, logo and navigations. There is one main site called “NaZemi” and multiple Sub Sites (will be defined later). 

To give complete clarity, there should be a select on top of the sidebar to select the site I want to be working with and then the whole sidebar should just deal with that site. The rest of the sidebar should be structured as a standard payload app:

## Globals

Each site has a set of globals. Organise them in tabs.

- General
  - Site Name
  - Site Sub-domain (if sub-site)
- Branding
  - Logo
  - Colour Palette
    - Primary Colour
    - Primary Background Colour
    - Accent Colour
    - Additional Colours (array)
- Navigation
  - Main menu
  - Secondary menu
- Contact
  - Social links (array)
    - Social network name
    - Profile URL
  - Contact details (array)
    - Contact title
    - Contact content
  - Full address (Rich text)
  - Additional content (Rich text)
- Meta (mainly for meta tags and social meta tags)
  - Description
  - Sharing image
  - (suggest more based on best practices, but keep it minimal)
- Functionality
  - Suggest a good ui to enable/disable collections (Pages always allowed)

## Collections

Each site has these collections available based on what is enabled in Globals / Functionality.

### Stránky

Live preview and versioning enabled.

Organise into tabs:

- Content
  - Title
  - Excerpt
  - Page content (Blocks)
- Meta
  - Slug (auto-generate from title on first save & make sure it's unique)
  - Description (default: is the same as Excerpt unless it's modified by user)
  - Sharing image (to override the global one if needed)

### Aktuality

Live preview and versioning enabled.

Organise into tabs:

- Content
  - Title
  - Cover image
  - Date published
  - Tags (Defined in the Tags collection)
  - Excerpt
  - Page content (Rich Text)
- Meta
  - Slug (auto-generate from title on first save & make sure it's unique)
  - Description (default: is the same as Excerpt unless it's modified by user)
  - Sharing image (to override the global one if needed)
  - Author (default: user, unless modified manually)

Entries published in the past are available, those published in the future are not. (Standard blog mechanic)

Special mechanic: Entries of this collection on the sub-sites have a toggle to also  display the entry on the main site (in the same collection) with a css class to identify which sub site this is from.

### Kalendář

Live preview and versioning enabled.

Organise into tabs:

- Content
  - Title
  - Cover image
  - Tags (Defined in the Tags collection)
  - Excerpt
  - Page content (Rich Text)
- Event details
  - Date or Date range
  - Location
    - Location name
    - Address
    - City
    - Maps link
  - Additional details (array)
    - Item title
    - Content (rich text)
  - Call to action(s) (array)
    - Button title
    - URL
  - Link to Workshop
    - Choose from Workshops collection (Relationship)
- Meta
  - Slug (auto-generate from title on first save & make sure it's unique)
  - Description (default: is the same as Excerpt unless it's modified by user)
  - Sharing image (to override the global one if needed)
  - Author (default: user, unless modified manually)

Special mechanic: Entries of this collection on the sub-sites have a toggle to also  display the entry on the main site (in the same collection) with a css class to identify which sub site this is from.

### Projekty

This collection is only available for the main site. 

Live preview and versioning enabled.

Organise into tabs:

- Content
  - Title
  - Logo
  - Project colour
  - Project website URL
  - Excerpt
  - Page content (Rich text)
- Meta
  - Slug (auto-generate from title on first save & make sure it's unique)
  - Description (default: is the same as Excerpt unless it's modified by user)
  - Sharing image (to override the global one if needed)

### Workshopy

Live preview and versioning enabled.

Organise into tabs:

- Content
  - Title
  - Cover image
  - Excerpt
  - Page content (Rich Text)
- Workshop details
  - Tagging
    - Duration (From Workshop Duration Tag, select 1)
    - Topic (From Workshop Topic Tag, Multi select)
    - Audience (From Workshop Audiences Tag, Multi select)
  - Additional details (array)
    - Item title
    - Content (rich text)
  - Call to action(s) (array)
    - Button title
    - URL
- Scheduled workshops
  - Display entires from “Kalendář” related to this workshop
- Meta
  - Slug (auto-generate from title on first save & make sure it's unique)
  - Description (default: is the same as Excerpt unless it's modified by user)
  - Sharing image (to override the global one if needed)
  - Author (default: user, unless modified manually)

Suggest more fields if needed for best practice.

# General instructions

Suggest more fields based on best practices, especially for meta fields etc. Ask before adding them.

Create one dummy sub-site for testing purposes.

Populate the site and sub-site with dummy content.

Create a barebones front-end without any styling, however I want to see structured text, images and all content displayed.