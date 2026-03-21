You are a senior frontend engineer. Build a complete React web application. The code should be clean, modular, production-ready, well-commented, and strictly follow a mobile-first responsive design approach.

### 1. Tech Stack
* React (latest) with functional components & Hooks (useState, useEffect, useContext if needed)
* React Router v6
* Axios for API calls
* TailwindCSS for UI styling (modern, clean, light theme, fully responsive)

### 2. Global UI/UX & Responsive Theme
* Fully responsive across Mobile (>=320px), Tablet (>=768px), and Laptop/Desktop (>=1024px).
* Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`) effectively.
* Ensure touch targets (buttons, input fields) are mobile-friendly (at least 44px height).
* Background: Light gray (`bg-gray-50`) for the main app area.
* Cards/Containers: White background with soft shadows (`shadow-md`, `rounded-lg`).
* Primary Color: Blue (used for main buttons, active states).
* Typography: Clean sans-serif (Inter or Roboto).

### 3. Features & Detailed UI Requirements

#### A. Authentication (LoginPage)
* UI: Centered white card on a light gray background. Responsive padding and width (e.g., full width on mobile with padding, fixed max-width on desktop). Include a placeholder logo and "Device Management System" title.
* Fields: Username, Password (with eye icon to toggle visibility).
* Button: Full-width blue "Login" button.
* Logic: Call API `POST /api/login`. Store token in `localStorage`. Redirect to Dashboard upon success. Protect all other routes.

#### B. Dashboard & Auto Scan (DashboardPage)
* UI - Navbar: App title/logo on the left. On desktop: "Welcome, User" + "Logout" button. On mobile: Keep it compact (e.g., just an avatar/icon and a logout icon).
* UI - Scan Section: "Available Devices" title, last updated time, and a "Network Scan" button.
* Responsive Grid: The device list must use CSS Grid/Flexbox. 
  * Mobile (`<768px`): 1 column.
  * Tablet (`>=768px`): 2 columns.
  * Desktop (`>=1024px`): 3 or 4 columns.
* Logic: Automatically call `GET /api/devices` on load. Poll every 10–30 seconds.
* API Response Example: `[{ "id": "device_1", "name": "Device 1", "ip": "192.168.1.10", "control_url": "..." }]`

#### C. UI Logic based on Device Count
* Case 1 (0 devices): Show an empty state card with an icon, "No devices found", and a "Re-scan" button.
* Case 2 (1 device): Skip the list and automatically display the Device Control View.
* Case 3 (Multiple devices): Show the responsive grid of `DeviceCard` components.

#### D. Device Card Component (DeviceCard)
* UI: A white card containing:
  * Device icon, Name (bold), IP (gray text).
  * Status indicator (green dot for "Online", gray for "Offline").
  * A blue "Control" button at the bottom.
* Action: Clicking navigates to the DeviceViewer.

#### E. Device Control View (DeviceViewer)
* Responsive Layout: 
  * Desktop/Laptop (`lg` and above): Split-screen layout. Left Sidebar (list of devices to quickly switch) and Right Main Area (large, full-height iframe).
  * Mobile/Tablet (`<1024px`): The Left Sidebar should be hidden by default and accessible via a Drawer, Bottom Sheet, or a Dropdown Select menu at the top to save screen space. The iframe must take up the maximum available height and width.
* iframe Logic: `src` must be the `control_url`. It must handle dynamic updates when switching devices. Iframe container must dynamically resize without breaking the layout (`w-full h-full`).

### 4. Architecture & Structure
Provide the full project structure and important files:
* `src/App.jsx` (Routing logic)
* `src/routes/` (Protected route wrappers)
* `src/pages/LoginPage.jsx`, `DashboardPage.jsx`, `DeviceViewerPage.jsx`
* `src/components/Header.jsx`, `DeviceList.jsx`, `DeviceCard.jsx`, `IframeViewer.jsx`
* `src/services/api.js` (Axios instance configured with auth token interceptor)

### 5. Behavior & Error Handling
* Loading states: Display skeleton loaders or spinners while scanning.
* Error handling: Handle invalid login, network errors, and missing `control_url` gracefully (toast notifications or inline alerts).

Please provide the complete, copy-pasteable React code for this setup.