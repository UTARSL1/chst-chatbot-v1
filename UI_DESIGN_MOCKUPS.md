# CHST-Chatbot V1 - UI Design Mockups & Specifications

## Design System

### Color Palette
- **Primary Gradient:** Blue (#3B82F6) to Purple (#8B5CF6)
- **Background:** Dark (#0F172A)
- **Surface:** Dark Gray (#1E293B)
- **Text Primary:** White (#FFFFFF)
- **Text Secondary:** Gray (#94A3B8)
- **Success:** Green (#10B981)
- **Warning:** Amber (#F59E0B)
- **Error:** Red (#EF4444)

### Role Badge Colors
- **Student:** Blue (#3B82F6)
- **Member (Staff):** Green (#10B981)
- **Chairperson:** Purple (#8B5CF6)
- **Public:** Gray (#6B7280)

### Typography
- **Font Family:** Inter (Google Fonts)
- **Headings:** Bold, 24-32px
- **Body:** Regular, 14-16px
- **Captions:** Regular, 12-14px

---

## Page Mockups

### 1. Sign In Page

![Sign In Page](C:/Users/ychum/.gemini/antigravity/brain/4eea16c3-f9e1-4f70-80ee-40745ce9e7b5/signin_page_mockup_1764055034250.png)

#### Features & Functionality
- **URL:** `/auth/signin`
- **Access:** Public (unauthenticated users)

**Elements:**
1. **CHST Logo/Icon** - Centered at top of card
2. **Welcome Message** - "Welcome to CHST-Chatbot V1"
3. **Subheading** - "Sign in to continue"
4. **Email Input** - With envelope icon, validation
5. **Password Input** - With lock icon and show/hide toggle
6. **Remember Me Checkbox** - Optional persistent session
7. **Sign In Button** - Full-width gradient button
8. **Forgot Password Link** - Below button
9. **Sign Up Link** - "Don't have an account? Sign up"

**Validation:**
- Email format validation
- Required field indicators
- Error messages below fields
- Disabled button until valid

**Behavior:**
- On successful login → Redirect to `/chat`
- On failed login → Show error message
- Loading state on button during authentication

---

### 2. Sign Up Page

![Sign Up Page](C:/Users/ychum/.gemini/antigravity/brain/4eea16c3-f9e1-4f70-80ee-40745ce9e7b5/signup_page_mockup_1764055052235.png)

#### Features & Functionality
- **URL:** `/auth/signup`
- **Access:** Public (unauthenticated users)

**Elements:**
1. **CHST Logo/Icon** - Centered at top
2. **Heading** - "Create Your Account"
3. **Full Name Input** - Required field
4. **Email Input** - With domain detection
5. **Role Badge** - Auto-detected based on email domain:
   - `@utar.edu.my` → **Member (Staff)** badge
   - `@1utar.my` → **Student** badge
   - Other domains → **Public** badge (requires admin approval)
6. **Password Input** - With strength indicator (weak/medium/strong)
7. **Confirm Password Input** - Must match password
8. **Chairperson Signup Code** - Collapsible section (optional)
   - Only visible when clicked "I have a chairperson code"
   - Validates against database
9. **Sign Up Button** - Full-width gradient button
10. **Sign In Link** - "Already have an account? Sign in"

**Email Domain Detection Logic:**
```javascript
if (email.endsWith('@utar.edu.my')) {
  role = 'member';
  autoApprove = true;
} else if (email.endsWith('@1utar.my')) {
  role = 'student';
  autoApprove = true;
} else {
  role = 'public';
  autoApprove = false; // Requires chairperson approval
}
```

**Validation:**
- Email uniqueness check (one account per email)
- Password strength requirements (min 8 chars, uppercase, number, special char)
- Password confirmation match
- Chairperson code validation (if provided)

**Behavior:**
- Auto-detect role as user types email
- Show/hide chairperson code section
- For public users → Show message "Your account will be reviewed by admin"
- On successful signup → Redirect to `/chat` (if auto-approved) or `/pending` (if public)

---

### 3. Chat Interface (Student/Member View)

![Chat Interface](C:/Users/ychum/.gemini/antigravity/brain/4eea16c3-f9e1-4f70-80ee-40745ce9e7b5/chat_interface_user_1764055071308.png)

#### Features & Functionality
- **URL:** `/chat`
- **Access:** Authenticated users (Student, Member, Chairperson)

**Layout:**
1. **Top Navigation Bar**
   - CHST logo (left)
   - "CHST-Chatbot V1" title
   - User role badge (Student/Member/Chairperson)
   - User name dropdown
   - Logout button

2. **Left Sidebar** (Collapsible)
   - "New Chat" button
   - Chat history list:
     * Chat title (first question preview)
     * Timestamp
     * Delete icon on hover
   - Collapse/expand toggle

3. **Main Chat Area**
   - **Welcome Screen** (on first load):
     * Welcome message explaining chatbot purpose
     * Sample question chips (clickable):
       - "How to apply for sabbatical leave?"
       - "Conference funding for students?"
       - "Internal grant deadlines?"
       - "Research ethics approval process?"
   
   - **Conversation View**:
     * User messages (right-aligned, blue bubble)
     * Bot messages (left-aligned, gray bubble)
     * Timestamp on each message
     * "Sources" section below bot responses showing retrieved documents
     * Typing indicator when bot is responding

4. **Message Input Area** (Bottom)
   - Multi-line text input (auto-resize)
   - Send button (gradient, disabled when empty)
   - Character count (optional)
   - Attachment icon (disabled for non-chairperson users)

**Behavior:**
- Auto-scroll to latest message
- Streaming responses (word-by-word)
- Click sample questions to auto-fill input
- Save chat history to database
- Load previous chats from sidebar

**Role-Specific Features:**
- **Student:** Can only access student-level documents
- **Member:** Can access student + member-level documents
- **Chairperson:** Full access + can see admin menu in navigation

---

### 4. Admin Dashboard (Chairperson Only)

![Admin Dashboard](C:/Users/ychum/.gemini/antigravity/brain/4eea16c3-f9e1-4f70-80ee-40745ce9e7b5/admin_dashboard_1764055095597.png)

#### Features & Functionality
- **URL:** `/admin/dashboard`
- **Access:** Chairperson only

**Layout:**
1. **Top Navigation**
   - CHST logo
   - "Admin Dashboard" title
   - Chairperson badge
   - User dropdown
   - Logout button

2. **Left Sidebar Navigation**
   - Dashboard (home icon) - Active
   - Chat (message icon) - Link to `/chat`
   - User Queries (search icon) - Link to `/admin/queries`
   - Document Management (folder icon) - Link to `/admin/documents`
   - Settings (gear icon) - Link to `/admin/settings`

3. **Main Content Area**
   
   **Statistics Cards** (Top row, 4 cards):
   - **Total Users**
     * Count with icon
     * Breakdown: X Students, Y Members, Z Public
   - **Total Queries**
     * Count with icon
     * Today's count vs. total
   - **Documents Uploaded**
     * Count with icon
     * Breakdown by access level
   - **Active Sessions**
     * Current active users
     * Peak time indicator

   **Recent Queries Table**:
   - Columns: User, Role (badge), Question (truncated), Timestamp, View button
   - Shows last 10 queries
   - Click "View" to see full conversation
   - "View All" link to `/admin/queries`

   **Quick Actions Panel**:
   - "Upload Document" button → Opens upload modal
   - "Generate Signup Code" button → Creates new chairperson code
   - "View Analytics" button → Detailed analytics page
   - "Approve Pending Users" button → Shows public users awaiting approval

   **Document Distribution Chart**:
   - Pie chart or bar chart showing:
     * Student-level documents: X
     * Member-level documents: Y
     * Chairperson-level documents: Z

**Behavior:**
- Real-time updates for active sessions
- Refresh statistics every 30 seconds
- Click on stats cards to drill down

---

### 5. Document Management (Chairperson Only)

![Document Management](C:/Users/ychum/.gemini/antigravity/brain/4eea16c3-f9e1-4f70-80ee-40745ce9e7b5/document_management_1764055118631.png)

#### Features & Functionality
- **URL:** `/admin/documents`
- **Access:** Chairperson only

**Layout:**
1. **Page Header**
   - "Document Management" title
   - "Upload Document" button (primary action)
   - Search bar (search by filename)

2. **Access Level Tabs**
   - Student Access (blue)
   - Member Access (green)
   - Chairperson Access (purple)
   - Active tab highlighted

3. **Documents Table**
   - **Columns:**
     * Filename (with PDF icon)
     * Access Level (color-coded badge)
     * Upload Date
     * File Size
     * Status (Processed ✓ / Processing ⏳)
     * Actions (View, Download, Delete icons)
   
   - **Row Actions:**
     * View: Preview PDF in modal
     * Download: Download original file
     * Delete: Confirm dialog → Remove from system

4. **Upload Modal** (Overlay)
   - **Drag-and-Drop Zone**
     * "Drag PDF files here or click to browse"
     * Multiple file support
     * File type validation (PDF only)
     * Max size: 10MB per file
   
   - **Access Level Selector**
     * Dropdown: Student / Member / Chairperson
     * Applies to all files in current upload
   
   - **File Preview List**
     * Shows selected files with:
       - Filename
       - Size
       - Remove button
   
   - **Upload Progress**
     * Progress bar for each file
     * Overall progress indicator
   
   - **Action Buttons**
     * "Cancel" - Close modal
     * "Upload Documents" - Start upload process

**Behavior:**
- After upload → Process PDF (extract text, generate embeddings)
- Show processing status in table
- Auto-refresh table when processing completes
- Confirm before deleting documents
- Filter/search updates table in real-time

**Processing Pipeline:**
1. Upload PDF to server
2. Extract text from PDF
3. Chunk text into segments
4. Generate embeddings for each chunk
5. Store in vector database with metadata
6. Update status to "Processed"

---

### 6. User Queries Viewer (Chairperson Only)

![User Queries Viewer](C:/Users/ychum/.gemini/antigravity/brain/4eea16c3-f9e1-4f70-80ee-40745ce9e7b5/user_queries_viewer_1764055140123.png)

#### Features & Functionality
- **URL:** `/admin/queries`
- **Access:** Chairperson only

**Layout:**
1. **Page Header**
   - "User Queries & Analytics" title
   - Export button (CSV/Excel)

2. **Filter Bar**
   - **Date Range Picker**
     * Presets: Today, Last 7 days, Last 30 days, Custom
   - **Role Filter**
     * Dropdown: All / Student / Member / Chairperson
   - **Search Box**
     * Search query text
   - **Apply Filters** button

3. **Queries Table**
   - **Columns:**
     * User Name
     * Role (color-coded badge)
     * Question (truncated with "..." and expand icon)
     * Timestamp
     * View Conversation button
   
   - **Expandable Rows:**
     * Click row to expand
     * Shows full conversation:
       - User question (full text)
       - Bot response (full text)
       - Retrieved documents (list with relevance scores)
       - Feedback (if user provided thumbs up/down)

4. **Statistics Sidebar** (Right side)
   - **Most Asked Questions** (Top 5)
     * Question text
     * Count
   
   - **Queries by Role** (Pie Chart)
     * Student: X%
     * Member: Y%
     * Chairperson: Z%
   
   - **Peak Usage Times**
     * Hour-by-hour heatmap
     * Busiest day/time

5. **Pagination**
   - Page numbers
   - Items per page selector (10/25/50/100)
   - Total count display

**Behavior:**
- Real-time updates (new queries appear automatically)
- Export filtered results to CSV
- Click on document names to view/download
- Sort by any column (click header)
- Expandable rows for detailed view

**Analytics Insights:**
- Identify common questions → Create FAQ
- Monitor document usage → Optimize RAG retrieval
- Track user engagement → Improve chatbot responses

---

## Responsive Design Considerations

### Mobile (< 768px)
- Collapsible sidebar (hamburger menu)
- Stack statistics cards vertically
- Simplified tables (show essential columns only)
- Bottom navigation for admin pages

### Tablet (768px - 1024px)
- Side-by-side layout for chat
- 2-column grid for statistics cards
- Condensed sidebar

### Desktop (> 1024px)
- Full layout as shown in mockups
- 4-column grid for statistics cards
- Expanded sidebar by default

---

## Accessibility Features

1. **Keyboard Navigation**
   - Tab through all interactive elements
   - Enter to submit forms
   - Escape to close modals

2. **Screen Reader Support**
   - ARIA labels on all icons
   - Semantic HTML structure
   - Alt text for images

3. **Color Contrast**
   - WCAG AA compliant
   - High contrast mode support

4. **Focus Indicators**
   - Visible focus rings
   - Skip to main content link

---

## Animation & Interactions

### Micro-animations
- Button hover effects (scale, glow)
- Card hover elevations
- Smooth page transitions
- Loading skeletons
- Toast notifications for actions

### Transitions
- Fade in/out for modals
- Slide in for sidebars
- Smooth scroll for chat messages
- Progress bars for uploads

---

## Next Steps

1. ✅ Review and approve mockups
2. ⏳ Set up Next.js project structure
3. ⏳ Implement authentication system
4. ⏳ Build RAG pipeline
5. ⏳ Develop frontend components
6. ⏳ Integration testing
7. ⏳ Deployment

**Please review these mockups and let me know if you'd like any changes before we proceed with development!**
