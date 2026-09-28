# Community Platform

A self-hosted full-stack community platform built with Next.js, TypeScript, Supabase/PostgreSQL, and Tailwind CSS.

It provides what a hosted community SaaS provides — courses, events, discussion, direct messaging, and paid content gating — as an owned codebase, so access rules, data, and billing integration stay under the operator's control.

**Scope:** 39 routes · 84 components · 24 server-action modules · ~37k lines of TypeScript · 61 migrations defining 46 tables, 186 RLS policies, and 46 PostgreSQL functions.

## Technical highlights

- **Next.js 15 App Router** — server components by default, route groups per shell area
- **TypeScript** — `strict: true`, typechecking clean under `tsc --noEmit`
- **PostgreSQL / Supabase** — schema managed as 61 ordered, idempotent migrations
- **Supabase Auth** — email/password and magic link, with cookie-based SSR sessions
- **PostgreSQL Row Level Security** — enabled on all 46 tables; 186 policies
- **Role and group-based authorization** — three roles plus composable access groups as the single entitlement primitive
- **Realtime messaging** — Supabase Realtime subscriptions for channels, threads, and DMs
- **Server Actions** — 24 colocated mutation modules; API routes reserved for true HTTP endpoints
- **Stripe webhook integration** — signature-verified checkout and subscription lifecycle handling
- **Resend email integration** — transactional templates behind a job runner, optional at runtime
- **Database migrations** — every schema and policy change version-controlled and replayable
- **Zod validation** — schemas validate server-action input before it reaches the database

## Architecture

```
Browser
  │  server components render; client components subscribe to Realtime
  ▼
Next.js 15 (App Router)
  │  Server Actions for mutations  ·  API routes for webhooks & OAuth callbacks
  ▼
Supabase client (per-request, cookie-scoped auth context)
  │  every query carries the caller's JWT
  ▼
PostgreSQL
     Row Level Security evaluates each query against the caller
     SECURITY DEFINER functions encode the access rules
     Triggers emit notifications and sync entitlements
```

The load-bearing decision is that **authorization lives in the database, not the application.** Access rules are `SECURITY DEFINER` PostgreSQL functions — `can_see_document()`, `can_access_lesson()`, `can_see_event()`, `has_course_access()`, `can_access_dm_thread()` — which RLS policies call. Requests reach Postgres carrying the caller's JWT, so a query is evaluated as that user.

*Why:* with 39 routes and 24 action modules touching the same tables, an application-layer check is one forgotten `if` away from a data leak. In the database, a missed check fails closed — the query returns zero rows instead of someone else's data.

*Cost:* authorization logic lives in SQL, which is harder to read and to unit-test than TypeScript. Those functions are where a reviewer should be most skeptical.

A second decision follows from it: **entitlements are group membership, not a purchase lookup.** A Stripe purchase never gets consulted at read time — a trigger writes `group_members` rows tagged `source = 'stripe'` and removes them when the purchase lapses. Every gate in the system then asks one question, "is this user in this group?", whether access came from a purchase, an admin grant, or a signup link.

## Selected implementation areas

**Authentication and authorization** — [lib/supabase/middleware.ts](lib/supabase/middleware.ts) refreshes the session on every request and enforces the deactivation and forced-onboarding gates, preserving auth cookies across redirects. [lib/auth/require-admin.ts](lib/auth/require-admin.ts) guards admin routes.

**RLS and group-based access** — [20240102000000_add_admin_helper.sql](supabase/migrations/20240102000000_add_admin_helper.sql) is the clearest entry point: the naive "admins can read all users" policy recurses, because evaluating it requires reading `users`. A `SECURITY DEFINER` function breaks the cycle, a pattern reused throughout. [20260912020000_add_documents.sql](supabase/migrations/20260912020000_add_documents.sql) shows the gating shape end to end — admin bypass, published check, "no groups means everyone", then group intersection. Two system groups, `everyone` and `team`, are maintained by trigger rather than by application code.

**Realtime messaging** — [components/chat/ChatView.tsx](components/chat/ChatView.tsx) and [components/dm/DMThreadView.tsx](components/dm/DMThreadView.tsx) subscribe to Postgres changes for live channels, threads, and direct messages. Thread access is itself an RLS function, so a subscription cannot surface a message the caller could not have queried.

**Stripe event handling** — [app/api/stripe/webhook/route.ts](app/api/stripe/webhook/route.ts) verifies signatures before doing any work and handles checkout completion, subscription updates and deletion, and payment failure with a grace period. The entitlement side is [20240107000000_phase4_stripe_products.sql](supabase/migrations/20240107000000_phase4_stripe_products.sql), where a trigger translates purchase state into group membership and `REVOKE EXECUTE` keeps that function out of reach of client roles.

**Admin and content management** — in-context editing for courses, lessons, documents, banners, navigation, and the sidebar, plus invite and signup links. The piece worth a look is [lib/preview/preview-helpers.ts](lib/preview/preview-helpers.ts): admins can browse as any access group, because gating bugs are otherwise invisible to the person configuring them — an admin bypasses every check.

**Concurrency** — [20260912130100_event_waitlist_functions.sql](supabase/migrations/20260912130100_event_waitlist_functions.sql) is the one genuinely concurrent path. Two simultaneous cancellations must not promote the same waitlisted user twice, so the capacity check and the promotion happen in one transaction inside Postgres rather than as read-then-write from the application.

## Known gaps

Stated plainly, since a reviewer will find them:

- **No automated test suite.** Correctness currently rests on RLS enforcement plus a manual test checklist. This is the gap I would close first.
- **The Stripe webhook is not idempotent.** Signatures are verified, but events are not deduplicated by ID, so a replay would be processed twice.
- **Zod coverage is partial** — 7 of 24 action modules validate with schemas; the rest rely on TypeScript types and database constraints.
- **~60 `any` annotations remain**, mostly where Supabase join results are reshaped in page components. They typecheck, but they are unchecked at the boundary where shape errors actually occur.
- **The service-role client bypasses RLS** ([lib/supabase/admin.ts](lib/supabase/admin.ts)). It is confined to authorization lookups where RLS would recurse, but that confinement is a convention, not something the type system enforces.
- **The admin preview cookie is `httpOnly` but unsigned** — its integrity depends on the admin check at the point it is set.

> **About the rest of this README:** everything below is the detailed build log, organized by the phase in which each subsystem was built — schema notes, per-phase decisions, and manual test checklists. Setup instructions are under [Setup Instructions](#setup-instructions).

---

## Phase 1 Features

✅ **Authentication**
- Email/password signup and login
- Magic link authentication
- Secure session management with middleware
- Fixed: Auth session properly integrated with RLS policies

✅ **User Management**
- User profiles with roles (admin, coach, client)
- Active/inactive status management
- Per-user resizable sidebar (200-480px) with persistence
- Fixed: Users can now read their own profile via standard SSR client

✅ **Admin Interface**
- Member management (search, role assignment, group assignment, activation/deactivation)
- Access groups CRUD (create, read, update, delete)
- Site settings (sidebar defaults, locked content messages)
- Fixed: Admin operations work correctly with proper RLS policies

✅ **Access Control**
- System groups: "everyone" (all active users), "team" (admins + coaches)
- Custom groups with manual membership
- Row-level security (RLS) policies properly configured
- Auth sync triggers
- `public.is_admin()` SECURITY DEFINER helper for admin checks

✅ **UI/UX**
- Responsive design with mobile drawer sidebar
- Resizable desktop sidebar with live persistence
- User name wrapping in sidebar
- Modern, clean interface

### Phase 1 Status & Known Issues

**What Works:**
- Authentication flows (signup, login, magic link, logout)
- User profile creation and management
- Admin can view/edit all users, groups, and settings
- Users can update their own sidebar width
- Role-based access control via RLS
- System group auto-management (everyone, team)

**Hardening pass:**
- Fixed auth contrast issues
- Fixed profile creation and reading via RLS
- Fixed admin authorization checks
- Fixed schema alignment (added `access_groups.slug` for live DB compatibility)
- Fixed default role assignment (now correctly uses 'client' not 'user')
- Proper use of admin client only for intentional service-role operations

**Environment Variables Required:**
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `NEXT_PUBLIC_SITE_URL`: Your site URL (e.g., http://localhost:3000)
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (for admin operations only)

**Testing Notes:**
- Apply migrations in order: `20240101000000_init_schema.sql`, `20240102000000_add_admin_helper.sql`, `20240103000000_fix_rls_and_schema.sql`
- First user needs manual promotion to admin via SQL (see Setup Instructions)
- An admin user can log in and manage members, groups, and settings
- Build passes with `npm run build`

## Phase 7: Email Notifications (Scaffolded)

✅ **Email Infrastructure**
- Resend integration via `resend` npm package
- Thin email wrapper (`lib/email/send.ts`) that respects `notification_prefs` table
- Graceful degradation: returns `{ skipped: true }` when `RESEND_API_KEY` is missing (never throws)
- From address uses `site_settings.support_email` or `EMAIL_FROM` env var

✅ **Email Templates**
- Welcome email: Sent after signup with dashboard link
- DM notification: Sent when user receives a new direct message (respects `dm_email` pref)
- Event reminder: Stub function ready for future cron integration

✅ **Integration Hooks**
- Signup flow (`lib/actions/auth.ts`): Sends welcome email after successful account creation
- DM flow (`lib/actions/dm.ts`): Sends notification email when client receives message from team
- Both hooks are non-blocking (fire-and-forget) and won't break auth/DM if email fails

✅ **Admin Settings**
- Added note in General tab: Email delivery requires `RESEND_API_KEY` environment variable
- No marketing blast UI (kept minimal per spec)

✅ **What's NOT Included**
- No live email sends until `RESEND_API_KEY` is configured for your own Resend project
- No `email_log` table (skipped per spec)
- No cron jobs for event reminders (stub function ready for future implementation)
- No migration changes (reuses existing `notification_prefs` table)

**Environment Variable Required for Live Delivery:**
- `RESEND_API_KEY`: Your Resend API key
- `EMAIL_FROM`: (Optional) From email address override

**Testing:**
- TypeScript compiles clean: `npx tsc --noEmit`
- Without `RESEND_API_KEY`: Emails are logged and skipped gracefully
- With `RESEND_API_KEY`: Emails are sent via Resend to actual recipients

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (@supabase/ssr, @supabase/supabase-js)
- **Validation:** Zod

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

### 1. Clone the Repository

\`\`\bash
git clone https://github.com/jeflor/community-platform.git
cd community-platform
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Configure Environment Variables

Copy the example environment file:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Edit `.env.local` and add your Supabase credentials:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL (https://your-project-ref.supabase.co)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon/public key
- `NEXT_PUBLIC_SITE_URL`: Your site URL (http://localhost:3000 for development)

Get these values from: [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Settings → API

### 4. Apply Database Migrations

**Option A: Using Supabase CLI (Recommended)**

Install the Supabase CLI:

\`\`\`bash
npm install -g supabase
\`\`\`

Link your project:

\`\`\`bash
supabase link --project-ref your-project-ref
\`\`\`

Push migrations:

\`\`\`bash
supabase db push
\`\`\`

**Option B: Manual SQL Execution**

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/your-project-ref/sql)
2. Open `supabase/migrations/20240101000000_init_schema.sql`
3. Copy and paste the entire SQL content
4. Click "Run" to execute

### 5. Run the Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Create Your First Admin User

1. Sign up for a new account at `/auth/signup`
2. The first user will be created with role `client` by default
3. To promote to admin, run this SQL in Supabase SQL Editor:

\`\`\`sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
\`\`\`

4. Refresh your browser and you'll see the admin menu items

## Build for Production

\`\`\`bash
npm run build
npm start
\`\`\`

## Project Structure

\`\`\`
community-platform/
├── app/ # Next.js App Router pages
│ ├── auth/ # Authentication pages (login, signup, callback)
│ ├── dashboard/ # Protected dashboard pages
│ │ ├── members/ # Admin: Member management
│ │ ├── groups/ # Admin: Group management
│ │ ├── channels/ # Admin: Channel management
│ │ ├── courses/ # Admin: Course management
│ │ └── settings/ # Admin: Site settings
│ ├── chat/ # Chat channel pages
│ ├── courses/ # Member course catalog and player
│ ├── api/ # API routes
│ └── globals.css # Global styles
├── components/ # React components
│ ├── admin/ # Admin-specific components
│ ├── chat/ # Chat components
│ └── sidebar/ # Sidebar components
├── lib/ # Utilities and libraries
│ ├── actions/ # Server actions
│ │ ├── auth.ts # Authentication actions
│ │ ├── admin.ts # Admin actions
│ │ ├── user.ts # User actions
│ │ ├── channels.ts # Channel actions
│ │ ├── messages.ts # Message actions
│ │ └── courses.ts # Course actions
│ ├── auth/ # Auth utilities
│ └── supabase/ # Supabase client utilities
├── supabase/ # Database migrations
│ └── migrations/
│ ├── 20240101000000_init_schema.sql
│ ├── 20240102000000_add_admin_helper.sql
│ ├── 20240103000000_fix_rls_and_schema.sql
│ ├── 20240104000000_add_chat_tables.sql
│ └── 20240105000000_add_courses_tables.sql
├── config/ # Configuration files
│ └── banners.ts # Banner configuration
├── middleware.ts # Auth middleware
└── package.json
\`\`\`

## Database Schema

### Tables

**Core**
- **users**: User profiles (extends auth.users)
- **access_groups**: Access control groups (everyone, team, custom)
- **group_members**: User-group memberships
- **site_settings**: Application-wide settings

**Chat (Phase 2)**
- **channels**: Chat channels with slug and type
- **channel_groups**: Channel-to-group access assignments
- **messages**: Chat messages with threading support
- **reactions**: Message reactions
- **mentions**: User mentions with read tracking

**Courses (Phase 3)**
- **courses**: Course catalog with publish status and locked content settings
- **course_groups**: Course-to-group access assignments
- **modules**: Course modules for organizing lessons
- **lessons**: Individual lessons with rich text, video, and attachments
- **enrollments**: User course enrollments
- **lesson_progress**: Lesson completion tracking

### Triggers

- **handle_new_user()**: Syncs new auth.users to public.users, adds to "everyone" group
- **maintain_team_membership()**: Auto-manages "team" group based on role changes
- **maintain_everyone_membership()**: Auto-manages "everyone" group based on active status

### Security

- Row-Level Security (RLS) enabled on all tables
- SECURITY DEFINER functions with restricted execute permissions
- Role-based access policies (admin, coach, client)

## Test Checklist

### Authentication
- [ ] Sign up with email/password
- [ ] Log in with email/password
- [ ] Request magic link
- [ ] Log in with magic link
- [ ] Log out
- [ ] Protected routes redirect to login
- [ ] Authenticated users redirect away from auth pages

### User Profile
- [ ] Sidebar width persists across sessions
- [ ] Sidebar resizable between 200-480px
- [ ] Mobile drawer opens/closes correctly
- [ ] User name displayed and wrapped properly

### Admin: Members
- [ ] View all members
- [ ] Search members by name/email
- [ ] Change user roles (admin, coach, client)
- [ ] Toggle user active/inactive status
- [ ] Add/remove users from groups
- [ ] Role changes update "team" group membership

### Admin: Groups
- [ ] View all groups
- [ ] Create new group
- [ ] Edit group (name, description)
- [ ] Delete group (non-system only)
- [ ] System groups cannot be modified
- [ ] Member count displayed correctly

### Admin: Settings
- [ ] **General tab**: Update community name, tagline, support email, DM toggle, powered-by toggle
- [ ] **Member Defaults tab**: Toggle weekly digest and pending user follow-ups
- [ ] **Navigation tab** ⭐: Enable/disable nav items, customize labels, set group access, add custom links
- [ ] **Navigation**: Verify dynamic sidebar rendering based on nav_items settings
- [ ] **Navigation**: Test as users in different groups to verify access filtering
- [ ] **Sidebar tab**: Update sidebar default widths (admin and user)
- [ ] **Locked Content tab**: Toggle locked messages and set per-type messages (courses, channels, events, documents)
- [ ] **Theme tab**: Set primary accent color, logo URL, background color, gradient colors, sidebar gradient toggle
- [ ] Settings persist after save and apply across the app
- [ ] Community name appears in sidebar and app title
- [ ] Sidebar navigation updates dynamically when nav_items settings change

### Admin: Channels (Phase 2)
- [ ] View all channels with their groups and positions
- [ ] Create new channel (chat or thread type)
- [ ] Edit channel (name, slug, type, description, position, groups)
- [ ] Delete channel (with confirmation)
- [ ] Assign multiple groups to a channel
- [ ] Channel visibility respects group membership

### Chat/Messaging (Phase 2)
- [ ] View channels in sidebar (separated by chat/thread)
- [ ] Send messages in chat channels
- [ ] Send messages in thread channels (top-level)
- [ ] Reply to threads in thread channels
- [ ] Edit own messages
- [ ] Delete own messages
- [ ] Admin can delete any message
- [ ] Add emoji reactions to messages
- [ ] Remove own reactions
- [ ] Real-time message updates
- [ ] Real-time reaction updates
- [ ] @mention autocomplete (limited to channel users)
- [ ] Messages show user name, role, timestamp
- [ ] Edited messages show "(edited)" indicator

### Build
- [ ] `npm run build` completes successfully
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Production build runs with `npm start`

## Phase 2 Features (Chat System)

✅ **Channels**
- Chat channels: Flat message list, newest at bottom, infinite scroll upward
- Thread channels: Top-level posts with replies, collapsed by default
- Channel visibility gated by group membership via RLS
- Admin-only channel management (CRUD + group assignment)

✅ **Messaging**
- Real-time message updates via Supabase Realtime subscriptions
- Create, edit, and delete messages
- Admins can delete any message; users can only delete their own
- Message timestamps with "edited" indicator
- Reply threading for thread-type channels

✅ **Reactions**
- Add/remove emoji reactions to messages
- Fixed emoji set: 👍 ❤️ 😂 🎉 🤔 👀
- Real-time reaction updates
- Reaction counts and who reacted

✅ **Mentions**
- @mention users with autocomplete
- Autocomplete limited to users with channel access
- Mention tracking with read status (data model ready, UI TBD)

✅ **Database Schema**
- `channels`: id, name, slug, type (chat|thread), description, position
- `channel_groups`: channel_id, group_id (junction table)
- `messages`: id, channel_id, user_id, parent_id, body, created_at, edited_at
- `reactions`: message_id, user_id, emoji
- `mentions`: message_id, mentioned_user_id, read_at

✅ **RLS Policies**
- Channel visibility via `can_see_channel()` helper function
- Users can only see channels if they're in an assigned group (or admin)
- Messages readable/writable only in accessible channels
- Reactions and mentions follow channel visibility

### How to Test Phase 2

1. **Run the new migration:**
 ```bash
 supabase db push
 # Or manually execute: supabase/migrations/20240103000000_add_chat_tables.sql
 ```

2. **Create channels as admin:**
 - Go to `/dashboard/channels`
 - Click "Create Channel"
 - Set name, slug, type (chat or thread), and assign groups
 - Users in assigned groups will see the channel in the sidebar

3. **Test chat channels:**
 - Navigate to a chat channel from the sidebar
 - Send messages, edit your own, delete messages
 - Add emoji reactions by hovering over messages
 - Test @mentions with autocomplete (type `@` and start typing a user's name)
 - Watch real-time updates in another browser/incognito window

4. **Test thread channels:**
 - Navigate to a thread channel from the sidebar
 - Start a new thread (top-level post)
 - Click "Show replies" to expand a thread
 - Add replies to a thread
 - Collapse threads to clean up the view

5. **Test group-based access:**
 - Create a channel assigned to a specific group
 - Verify users not in that group can't see the channel
 - Add a user to the group and verify the channel appears

### Known Gaps in Phase 2

- Mention read status tracking exists in DB but no UI notification badge yet
- No infinite scroll implementation yet (only loads last 50 messages)
- No message search or filtering
- No file/image uploads in messages
- No markdown or rich text formatting
- No user presence indicators (online/offline)
- No typing indicators
- No message pinning or bookmarking
- No channel archive/mute functionality
- No unread message counts per channel
- Thread view doesn't show reply preview before expansion


## Phase 3 Features (Courses System)

✅ **Member Course Experience**
- **Course Catalog** (`/courses`):
 - Collapsible sections to organize courses (e.g., "Video Training Courses")
 - 3-column responsive card layout with course covers (16:9 aspect ratio)
 - Progress bars showing lesson completion percentage
 - Lesson count badges on cards
 - Admin buttons: Rearrange, Create Course (admin-only)
- **Course Landing Page** (`/courses/[slug]`):
 - Wide hero banner with title overlay and breadcrumbs
 - Course description and module/lesson list as clickable links
 - Right sidebar: "Pick up where you left off" card with next lesson and progress
 - Direct links to each lesson (no accordion - opens dedicated lesson player)
- **Lesson Player** (`/courses/[slug]/lessons/[lessonId]`):
 - Dedicated full-page lesson view with large 16:9 video player
 - Breadcrumb navigation: Video Courses → Course → Lesson
 - Lesson title, body content, and attachments below video
 - "Next Lesson" CTA with encouraging message ("Nicely done! Let's keep it up!")
 - Right sidebar: "All Lessons" grouped by module with completion indicators (checkmarks vs empty circles)
 - Mobile responsive: sidebar becomes collapsible below video on small screens
 - Mark complete button in sidebar

✅ **Admin Course Management**
- **Course CRUD**:
 - Create, edit, delete courses with sections support
 - Section field to group courses in the catalog
 - Banner URL with recommended 16:9 ratio guidance
 - Simple rich text editor with formatting toolbar (Bold, Italic, Headings, Links, Lists)
 - Assign courses to access groups
 - Publish/unpublish courses
 - Set custom locked messages and visibility (show_locked vs hide)
 - Position/ordering for courses, modules, and lessons
- **Admin Actions** (per course):
 - **Progress**: View User Progress page showing enrollment and completion stats
 - **Preview**: Opens course landing in new tab to preview member view
 - **Modules**: Manage modules and lessons
 - **Edit**: Update course details
 - **Delete**: Remove course (with confirmation)
- **View User Progress** (`/dashboard/courses/[courseId]/progress`):
 - Table showing all enrolled students with:
 - Name, email, enrollment date
 - Progress bar and percentage
 - Completed lessons count (e.g., "5/12 lessons")
 - Last completed lesson and date
 - Summary stats: Total Enrolled, Completed, Average Progress

✅ **Rich Text Editing**
- Simple toolbar with formatting buttons: Bold, Italic, H2, H3, Link, Bullet List, Numbered List, Paragraph, Line Break
- Inserts HTML tags around selected text or at cursor
- No external WYSIWYG library - custom implementation
- Allowed HTML tags: p, br, strong, em, b, i, ul, ol, li, a, h2, h3
- Safe rendering with dangerouslySetInnerHTML (sanitization in place)

✅ **Storage & Assets**
- Supabase Storage bucket: `course-assets` for banners and attachments
- Public bucket with 50MB file size limit
- Allowed MIME types: images (jpeg, png, gif, webp), PDFs, Office docs, videos
- RLS policies: Anyone can view, admins can upload/update/delete
- URL fields remain as fallback for external asset links

✅ **Access Control & Enrollment**
- Row-level security on all course tables
- Group-based course access control
- Enrollment tracking per user
- Individual lesson progress tracking with `lesson_progress` table
- Auto-enrollment trigger when user joins linked group
- Next lesson detection for "continue learning" flow

### How to Create a Course (Phase 3 Updated)

1. **Log in as admin** and go to **Admin → Courses** (`/dashboard/courses`)
2. **Create a course:**
 - Click "New Course"
 - Set title, slug, description
 - Add banner image URL (recommended 16:9 ratio)
 - Set section name (e.g., "Video Training Courses") for catalog grouping
 - Set locked message and visibility (show_locked / hide)
 - Assign to one or more access groups
 - Mark as published when ready
 - Click "Save"
3. **Add modules:**
 - Click "Modules" on the course row
 - Click "New Module"
 - Set title and description
 - Click "Save"
4. **Add lessons:**
 - Click "Lessons" within a module
 - Click "New Lesson"
 - Set title
 - Use rich text editor toolbar to format lesson body (Bold, Italic, Links, Lists, Headings)
 - Add video URL (YouTube, Vimeo, Loom embeds supported)
 - Attachments: Add via JSON or upload to Supabase Storage (future)
 - Click "Save"
5. **Preview & Monitor:**
 - Click "Preview" to view course landing as a member
 - Click "Progress" to see enrollment and completion statistics
6. **Members access:**
 - Members in assigned groups will see the course in their catalog at `/courses`
 - They can enroll and start learning
 - Auto-enrollment happens when users join linked groups
 - Course catalog is grouped by sections with collapsible UI

### What Changed in Phase 3 Polish

**Member Experience:**
- ✅ Course catalog now has sections (collapsible groups)
- ✅ Course cards redesigned: 16:9 covers, lesson count, cleaner progress bars
- ✅ Course landing page: hero banner, breadcrumbs, "Pick up where you left off" card
- ✅ Dedicated lesson player with large video, next lesson CTA, and sidebar navigation
- ✅ Mobile-responsive lesson sidebar (collapses below video on small screens)

**Admin Experience:**
- ✅ Section field added to courses (group courses in catalog)
- ✅ Rich text editor with toolbar for lesson body (no external library)
- ✅ View User Progress page per course (enrollment stats, completion %)
- ✅ Preview and Progress buttons in course list
- ✅ Banner ratio guidance (16:9 recommended)
- ✅ Supabase Storage bucket for course assets (`course-assets`)

**Technical:**
- ✅ Migration: `20240110000000_add_course_sections.sql` (adds `section` column)
- ✅ Migration: `20240111000000_add_course_storage.sql` (Supabase Storage bucket + policies)
- ✅ New routes:
 - `/courses/[slug]/lessons/[lessonId]` - Lesson player
 - `/dashboard/courses/[courseId]/progress` - Admin user progress
- ✅ New actions: `getLessonById()`, `getNextLesson()`, `getCourseUserProgress()`
- ✅ New component: `SimpleRichTextEditor` (custom toolbar, no deps)

### Known Gaps in Phase 3

**Not Implemented (as per spec):**
- No drip scheduling (all lessons immediately available on enrollment)
- No certificates or course completion badges
- No quizzes or assessments
- No course search or filtering
- No course ratings or reviews
- No discussion forums per course
- File upload UI not yet wired (Supabase Storage bucket ready, UI TBD)

**Future Enhancements:**
- Wire file upload UI for banners and attachments (bucket is ready)
- Add image cropper for banner uploads (no-dependency constraint)
- Course reordering/drag-drop UI
- Lesson video progress tracking (resume where you left off)
- Certificate generation on completion

## Future Phases (Not Yet Implemented)

- Stripe payments integration

## Phase 4 Features

✅ **Chat & Messaging**
- Channel-based chat system
- Thread support for organized discussions
- Real-time message reactions with emoji
- User mentions with @username
- Access control via group assignments
- Admin channel management (CRUD operations)
- Position-based channel ordering

## Phase 6 Features (Admin Site Settings)

✅ **Site Settings Expansion**
- Tabbed settings UI (6 tabs)
- **General**: Community/site name, tagline, support email, direct messaging toggle, powered-by toggle
- **Member Defaults**: Weekly digest toggle, pending user follow-ups toggle (email delivery in Phase 7)
- **Navigation** ⭐ HIGH VALUE: Configure top-level nav items with:
 - Enable/disable toggles per nav item
 - Custom labels (e.g., "Video Courses" instead of "Courses")
 - Group-based access control (comma-separated slugs like `free-members, paid-students`)
 - Custom link support (add your own URLs)
 - Dynamic sidebar rendering based on user's group membership
 - Admins always see all enabled items; regular users see filtered items
- **Sidebar**: Admin and user default sidebar widths (200-480px)
- **Locked Content**: Enable toggle plus per-content-type locked messages (courses, channels, events, documents)
- **Theme**: Primary accent color, logo URL, background color, gradient colors (start/end), sidebar gradient toggle
- Settings stored in `site_settings` table with keys: `site_name`, `site_tagline`, `support_email`, `direct_messaging_enabled`, `show_powered_by`, `member_defaults`, `nav_items`, `locked_messages`, `theme`
- Community name wired into sidebar, mobile sidebar, and app title
- Migrations seed default values including sensible nav defaults matching Free/Paid IA
- Migration migrates legacy `locked_message_text` to new `locked_messages` structure

### How to Test Phase 6

1. **Apply the migrations:**
 ```bash
 supabase db push
 # Or manually execute:
 # - supabase/migrations/20240108000000_add_site_settings.sql
 # - supabase/migrations/20240109000000_add_navigation_and_theme_settings.sql
 ```

2. **Access settings as admin:**
 - Log in as an admin user
 - Go to `/dashboard/settings`
 - Navigate through the six tabs: General, Member Defaults, Navigation, Sidebar, Locked Content, Theme

3. **Test General settings:**
 - Change the community name and tagline
 - Add a support email
 - Toggle direct messaging and powered-by settings
 - Save and verify the name appears in the sidebar and browser title

4. **Test Member Defaults:**
 - Toggle weekly digest on/off
 - Toggle pending user follow-ups (note the Phase 7 disclaimer)
 - Save and verify persistence

5. **Test Navigation (HIGH VALUE):**
 - View the default nav items (Dashboard, Video Courses, Events, Offers)
 - Toggle nav items on/off
 - Change labels (e.g., rename "Courses" to "Video Courses")
 - Edit group access control:
 - Enter comma-separated group slugs like `free-members, paid-students`
 - Note: You must create matching access groups with these slugs
 - Or edit to match existing group slugs in your database
 - Add a custom link by clicking "+ Add Custom Link"
 - Save and refresh to see sidebar update dynamically
 - Test as different users in different groups to verify access filtering
 - Verify admins see all enabled items

6. **Test Sidebar settings:**
 - Adjust admin and user default widths
 - Save and verify new users get the updated defaults

7. **Test Locked Content:**
 - Enable/disable locked messages
 - Customize messages for each content type (courses, channels, events, documents)
 - Save and verify the messages are used when content is locked

8. **Test Theme:**
 - Pick a primary accent color
 - Add a logo URL (preview shows if valid)
 - Set background color and gradient colors (start/end)
 - Toggle sidebar gradient on/off
 - Save and verify colors are stored

## Admin Preview Mode

✅ **Preview as Access Groups**
- Admin-only feature to preview the site as members with specific access groups
- Blue banner at the top showing current preview state with group selector
- Navigation and content filtered based on selected group membership
- "Paid Students" preview automatically includes "Free Members" access (superset)
- Exit preview button returns to full admin view
- Admin navigation remains accessible during preview for settings/exit

### How to Test Preview Mode

1. **Log in as admin** and navigate to **Admin → Preview Mode** in the sidebar
2. **Select an access group:**
 - Choose "Free Members" or "Paid Students" from the dropdown
 - Note: Paid Students automatically includes Free Members access
 - Click "Start Preview"
3. **Preview the site:**
 - A blue banner appears at the top: "Previewing community as [group]"
 - Navigation is filtered to show only what that group would see
 - Admin navigation remains visible so you can access Settings or exit
4. **Switch groups:**
 - Use the dropdown in the blue banner to switch between groups
 - The UI refreshes to show the new group's view
5. **Exit preview:**
 - Click "Exit Preview" in the banner to return to full admin view
 - Or navigate to Preview Mode page and clear preview

### Preview Mode Technical Details

- Preview state stored in httpOnly cookie (admin-only)
- Navigation filtering uses `getEffectiveGroupSlugs()` helper
- When previewing, admin role treated as "client" for nav visibility
- Preview does not modify actual group_members rows in database
- Non-admins cannot set or access preview mode

## Phase 5 Features (Events & Calendar)

✅ **Events & Calendar**
- Event creation and management (admin)
- Agenda view with date grouping (e.g., "Fri, Sep 11", "Mon, Sep 14")
- Dedicated event detail pages (`/dashboard/events/[id]`)
- Upcoming and past event listings with toggle navigation
- RSVP system (going/not going/maybe) with status badges
- Zoom meeting link integration with "Protected Link" treatment (manual URL entry)
- Zoom link only revealed to users who RSVP'd "going"
- Cover images for events with upload prompts for admins
- Recording URL support for past events (optional field)
- "This event has ended" state with View Recording button
- Event host display with avatar and name
- Locked content messaging (visibility control via groups)
- ICS calendar download (add-to-calendar)
- Access control via group assignments and RLS
- Event reminder email hooks (stubs for Phase 7 - not implemented)
- Admin toolbar on detail pages (Preview/Event Details tabs, Edit button)
- Breadcrumb navigation (Events → Event Title)
- Mobile-responsive layout (390px+ support)

### Phase 5 Status & Testing

**What Changed:**
- Transformed events list from expand-in-place cards to clean agenda view with date grouping
- Created dedicated event detail pages instead of accordion-style expansion
- Added recording_url column to events table for post-event recordings
- Updated UserProfile type to include avatar_url field
- Added admin toolbar with Preview/Event Details toggle and Edit/Send Blast buttons
- Refined events UX
- RSVP controls moved to detail page with better visual feedback
- Zoom URL protection enforced (only shown if RSVP status is "going")
- Cover image upload prompts visible to admins
- Event ended state with recording access button

**How to Test:**
1. Apply the new migration: `supabase db push` or manually run `20240106000001_add_recording_url_to_events.sql`
2. Create an event as admin at `/dashboard/admin/events`
3. Add title, description, start/end times, Zoom URL (optional), cover image URL (optional)
4. Assign to one or more access groups
5. Visit `/dashboard/events` to see the agenda view with date grouping
6. Click an event to view the dedicated detail page
7. RSVP as "Going" to reveal the Zoom link (Protected Link badge)
8. Download ICS file to add to your calendar
9. Test as a non-member of assigned groups to verify locked content message
10. For past events, add a recording URL in the admin form to enable "View Recording" button

**Known Gaps (By Design):**
- No Zoom OAuth integration (manual URL paste only)
- No automated reminder emails (Phase 7 - Resend integration pending)
- No recurring events (no RRULE support - admins create separate events)
- No calendar view (agenda view is the default and only view)
- No email blast feature (Send Blast button is disabled with "Phase 7" note)
- Cover images are external URLs (no Supabase Storage upload yet)

**TypeScript Check:**
- All type errors resolved (`npx tsc --noEmit` passes)
- UserProfile updated with avatar_url field
- Event interfaces include recording_url

## Phase 6: Direct Messages (Client-to-Team) & Coach Dashboard

Phase 6 adds client-to-team direct messaging and a coach dashboard for tracking student progress.

### Phase 6 Features

✅ **Direct Messages**
- Clients have ONE thread with "the team" (admins and coaches)
- Team members can view and reply to all client threads
- Real-time messaging via Supabase Realtime
- Unread message badge in sidebar
- Mobile-responsive two-pane inbox (list + thread)
- Message composer with keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Site setting `direct_messaging_enabled` controls client access (admins/coaches always have access)

✅ **Coach Dashboard**
- Coaches see their assigned students
- Admins see all students
- Per-student view shows:
 - All enrolled courses with progress percentage
 - Total lessons vs completed lessons per course
 - Last active date (from latest: user activity, DM, or lesson completion)
 - Last lesson completed with title
 - Quick link to open DM with student
- Detailed student view shows lesson-by-lesson progress per course
- Admin can assign/unassign coaches to students (one coach per student)

✅ **Database Schema**
- `dm_threads`: One thread per client (UNIQUE constraint on client_id)
- `dm_participants`: Tracks which team members have joined/replied
- `dm_messages`: DM messages with read tracking
- `coach_students`: Coach-to-student assignments (UNIQUE student_id)

✅ **Access Control**
- Clients can only see/message their own thread
- Admins and coaches can see/message all threads
- Clients cannot create multiple threads (enforced by UNIQUE constraint)
- Team members can start threads with any client
- RLS policies enforce thread access rules

### Phase 6 Routes

- `/dashboard/messages` - DM inbox (team sees list, clients redirect to their thread)
- `/dashboard/messages/[threadId]` - DM thread view with realtime updates
- `/dashboard/coaches` - Coach/admin dashboard listing all students
- `/dashboard/coaches/[studentId]` - Detailed student progress view

### Phase 6 UI

- Messages icon with unread count badge in sidebar (always visible)
- "Students" / "My Students" link in sidebar (admins and coaches only)
- Two-pane inbox: thread list (left) + conversation (right)
- Mobile: single column, switches between list and thread
- Empty state when no conversation selected

### How to Test Phase 6

1. **Apply the migration:**
 ```bash
 supabase db push
 # Or manually execute: supabase/migrations/20260911140730_add_dms_and_coaches.sql
 ```

2. **Test Direct Messages as Client:**
 - Log in as a client user
 - Click "Messages" in the sidebar
 - You'll be auto-redirected to your team thread
 - Send a message to the team
 - See unread badge update in realtime

3. **Test Direct Messages as Admin/Coach:**
 - Log in as an admin or coach
 - Click "Messages" in the sidebar
 - See list of all client threads with last message preview
 - Click a thread to open the conversation
 - Send a message to the client
 - Create a new thread by searching for a client
 - Unread count shows messages from clients

4. **Test Coach Dashboard:**
 - Log in as a coach
 - Click "My Students" in the sidebar
 - See your assigned students with course progress
 - Click "View Progress" to see detailed lesson-by-lesson progress
 - Click "Message" to open DM with that student

5. **Test Coach Assignment (Admin):**
 - Log in as an admin
 - Click "Students" in the sidebar
 - Use the dropdown to assign coaches to students
 - Each student can have only one coach
 - Select "No coach" to unassign

6. **Test Mobile Responsiveness:**
 - Resize browser to mobile width (390px)
 - Inbox should show either list OR thread, not both
 - Navigation between list and thread should work
 - Message composer should be usable on mobile

### Phase 6 Settings

- `direct_messaging_enabled` (boolean) in `site_settings`:
 - `true` (default): Clients can access and use DMs
 - `false`: DMs hidden from clients; admins/coaches can still use coach dashboard and DMs

### Known Gaps in Phase 6

- No member-to-member DMs (only client-to-team)
- No GIF picker or file attachments in messages
- No voice rooms or video calls
- No message search or filtering
- No coach assignment UI in Members page (only in Students page)
- Coach notifications are unread badges only (email notifications in Phase 7)
- Last active date is an approximation (uses latest available timestamp)

## Future Phases (Not Yet Implemented)

- Courses and content delivery
- ~~Stripe payments integration~~ (Phase 4 - completed)

- Events and calendar
- Direct messages (1-on-1 chat)
- Email notifications (Phase 7: Resend integration)
- Docker deployment
- Advanced course features (drip scheduling, certificates, quizzes)

## Phase 4: Stripe Payments & Upsells (Framework)

Phase 4 adds the skeleton framework for Stripe-based product purchases and access control. This is a test-mode-first implementation ready for product configuration.

### Phase 4 Features

✅ **Products & Product Groups**
- Admin UI to create and manage products
- Link Stripe Product and Price IDs
- Product position ordering
- Custom pitch and locked content messages
- Product groups that grant access to specific access groups

✅ **Checkout & Purchases**
- Stripe Checkout Session creation
- Purchase tracking with subscription management
- Customer portal access stub (account settings)
- Grace period handling (3 days default)

✅ **Webhooks**
- `/api/stripe/webhook` route with skeleton handlers
- `checkout.session.completed` - creates purchase records
- `customer.subscription.updated` - updates purchase status
- `customer.subscription.deleted` - cancels access
- `invoice.payment_failed` - sets grace period

✅ **UI Components**
- Offers page showing unpurchased products
- Locked content prompt components (full-page and inline)
- Admin products management interface
- Customer portal link in account settings (stub)

✅ **Access Control**
- Automatic group membership sync via purchases
- Source tracking: `manual` vs `stripe`
- Grace period support for failed payments

### Phase 4 Setup

The application builds and runs without Stripe keys configured. Stripe features will show clear error messages when keys are missing.

#### 1. Apply Database Migration

Run the Phase 4 migration to create the products, product_groups, and purchases tables:

```bash
supabase db push
```

Or manually apply `supabase/migrations/20240107000000_phase4_stripe_products.sql` in the Supabase SQL Editor.

#### 2. Configure Stripe (Test Mode First)

1. Sign up for a Stripe account at https://stripe.com
2. Use **test mode** for development
3. Get your test API keys from https://dashboard.stripe.com/test/apikeys
4. Add to your `.env.local`:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

#### 3. Set Up Stripe Webhook (For Local Testing)

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Forward webhooks to your local server:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

3. Copy the webhook signing secret and add to `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

For production, create a webhook endpoint in Stripe Dashboard pointing to `https://your-domain.example.com/api/stripe/webhook`.

#### 4. Create Products in Stripe

1. Go to https://dashboard.stripe.com/test/products
2. Create a new product (e.g., "Premium Membership")
3. Add a recurring price (e.g., $29/month)
4. Copy the Product ID (`prod_...`) and Price ID (`price_...`)

#### 5. Link Products in Admin

1. Navigate to `/dashboard/products` (admin only)
2. Go to the "Product Groups" tab
3. Create a new product group and link it to an access group (e.g., link to "Premium Members" access group)
4. Go back to the "Products" tab
5. Create a new product:
 - Enter name, description, and sales pitch
 - Paste the Stripe Product ID and Price ID
 - Select which product groups it grants access to
 - Set position and active status
6. Product will now appear on the `/dashboard/offers` page

#### 6. Test Purchase Flow

1. Visit `/dashboard/offers` as a regular user
2. Click "Purchase" on a product
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete checkout
5. Verify purchase is recorded and user gains group access

### Phase 4 Notes

- **Test mode only**: Use Stripe test keys during development
- **Grace period**: Failed payments get a 3-day grace period before access is revoked
- **Customer portal**: Link to Stripe's customer portal for subscription management
- **Build without keys**: The app builds successfully even without Stripe configuration
- **Clear errors**: Missing Stripe keys show helpful error messages to admins

### Phase 4 Database Schema

#### `products`
- Links to Stripe products and prices
- Includes `pitch` and `locked_message` fields
- Position-based ordering

#### `product_groups`
- Maps products to access groups
- Products can grant access to multiple groups

#### `purchases`
- Tracks user purchases and subscriptions
- Includes Stripe customer, subscription, and session IDs
- Status and payment tracking with grace periods

### Future Enhancements (Post-Phase 4)

- One-time payment support
- Tiered pricing
- Promo codes and discounts
- Purchase history UI
- Revenue analytics dashboard
- Automated email notifications for purchases
- Course and event content unlocking

## Support

For issues or questions:
1. Check the [Supabase documentation](https://supabase.com/docs)
2. Review the [Next.js documentation](https://nextjs.org/docs)
3. Open an issue in the GitHub repository

## Application Shell & Information Architecture

✅ **Application Shell**
- Light sidebar with community logo, name, and sectioned navigation
- Top navigation: Pulse, Video Courses, Resources, Events, Members (admin), Support
- Collapsible sections with group-based visibility (Free Members vs Paid Students)
- Resizable sidebar (200-480px) with persistence
- Header bar: search, DM icon, notifications bell, settings gear, avatar menu
- Right presence rail: stacked avatars of active users (12 max, hidden on mobile)
- Mobile: full-width drawer with hamburger menu
- Dark gray admin sidebar replaced with a light application shell

✅ **Admin Sidebar Management UI**
- Settings → Sidebar tab: drag-and-drop reordering of sections and items
- Edit appearance: label, href, icon/emoji, enabled toggle, group visibility
- Add/delete sections and items with confirmation
- Preview-as-group honors saved order and visibility
- Names wrap without truncation (spec 8.1)

✅ **Seeded Sitemap**
- START HERE, FOUNDATIONAL RESOURCES, COACHING, COURSES, INTERACTIVE TRAINING, THE AI HUB, MAGIC MAP, BONUS RESOURCE CENTER, CODE OF CONDUCT
- Group gating: everyone, free-members, paid-students
- Placeholder pages at /resources/[slug] for content migration

✅ **Pulse**
- Composer card for posting updates
- Feed of pulse posts with user avatars and roles
- Welcome card and community promo
- Real-time feed via Supabase RLS

✅ **Resources & Support**
- /resources: overview page with placeholders
- /resources/[slug]: dynamic placeholder pages for each resource item
- /support: help page with community support info

✅ **Members Directory Restyle**
- Card-based layout with avatars
- Search by name/email
- User cards show: avatar, name, role badge, colored group badges
- Admin edit panel: role, groups, active status
- Brand color palette for badges

✅ **Courses & Events in Shell**
- /courses and /courses/[slug] wrapped in AppShell
- /dashboard/events wrapped in AppShell
- Removed standalone gray layouts
- All logged-in pages share the same app chrome

✅ **Theme CSS Variables**
- Primary color, background, gradient colors applied from site_settings.theme
- Sidebar gradient toggle
- Logo URL from site_settings
- Default colors: primary #1E3A7A, gradient #EAF0FB→#FBF5D6

### How to Test the Application Shell

1. **Apply the migration:**
 ```bash
 supabase db push
 # Or manually execute: supabase/migrations/20260912010000_app_shell_ia.sql
 ```

2. **Create access groups (if not present):**
 - Go to `/dashboard/groups` as admin
 - Create groups with slugs: `free-members`, `paid-students`
 - Assign users to groups to test visibility

3. **Test as admin:**
 - Log in as admin
 - Navigate through all pages: /pulse, /courses, /dashboard/members, /resources, /support
 - Verify light sidebar, header bar, presence rail appear on all pages
 - Go to `/dashboard/settings` → Sidebar tab
 - Drag sections and items to reorder
 - Edit an item's label, href, icon, or group visibility
 - Add a new section or item
 - Delete an item (with confirmation)

4. **Test Preview Mode:**
 - Go to `/dashboard/preview`
 - Select "Free Members" from dropdown
 - Verify COACHING section is hidden (it's paid-students only)
 - Verify Wednesday Sessions and Live Support Schedule are hidden (paid-students only)
 - Switch to "Paid Students"
 - Verify COACHING section and extra INTERACTIVE TRAINING items appear
 - Exit preview

5. **Test as regular user:**
 - Log out and create/log in as a regular client user
 - Add user to `free-members` group (admin)
 - Verify sidebar shows only Free Members content
 - Remove from `free-members`, add to `paid-students`
 - Verify sidebar shows Paid Students content (superset of Free)

6. **Test Mobile:**
 - Resize browser to 390px width
 - Verify sidebar collapses to hamburger menu
 - Open menu, verify full sidebar in drawer
 - Verify presence rail hidden on mobile

## Documents (Admin-Editable Resources)

✅ **In-Place Document Editor**
- Admin-editable documents replacing static `/resources/*` placeholders
- In-context editor: click Edit on any `/resources/[slug]` page to edit in place
- Rich content: title, cover image (16:9 recommended), video embed (YouTube/Vimeo/Loom), HTML body, attachments
- Simple formatting toolbar: bold, italic, H2/H3, links, lists, paragraphs
- Access control: published toggle, locked message override, visibility (show_locked/hide), group-based access
- Auto-creation: When admins add a sidebar item with href `/resources/foo`, a draft document with slug `foo` is auto-created

✅ **Member View**
- `/resources` overview: grid of published documents with cover images, title, body preview
- `/resources/[slug]`: Full document with breadcrumb, cover, video, body, attachments
- Locked documents show custom message (or site default) based on visibility setting
- Empty body shows "Add content" prompt for admins

✅ **Data Model**
- `documents` table: slug, title, body (HTML), cover_url, video_url, attachments (JSON), is_published, locked_message, visibility, created_by
- `document_groups` junction table for group-based access
- RLS with `can_see_document()` helper (SECURITY DEFINER, GRANT EXECUTE TO authenticated)
- Seeded from existing sidebar items during migration

### How to Edit a Document

1. **Navigate to a resource** (e.g., `/resources/announcements`) via sidebar
2. **Click Edit** (admin-only button in top-right)
3. **Edit content:**
 - Title and slug (slug locked after create)
 - Cover image URL (16:9 aspect ratio recommended)
 - Video URL (YouTube, Vimeo, Loom)
 - Body using the formatting toolbar (bold, italic, headings, links, lists)
 - Attachments (name, URL, type)
 - Published toggle
 - Locked message override and visibility (show_locked vs hide)
 - Access groups (leave empty for all authenticated users)
4. **Click Save** to update (stays on same page)
5. **View as member** using Preview As Group dropdown

### How Sidebar Items Auto-Create Documents

When an admin adds a sidebar item with href `/resources/<slug>` (via Settings → Sidebar):
1. System checks if `documents.slug = <slug>` exists
2. If not, creates a new draft document with `slug = <slug>`, `title = item label`, `is_published = true`, empty body
3. Links document to same groups as the sidebar item (if any)
4. Admin can then navigate to `/resources/<slug>` and click Edit to fill in content

## Offers and Locked Content

✅ **Paywall**
- Friendly lock cards with site-customizable messages per content type (courses, events, documents, channels)
- Navy (#1E3A7A) primary CTA buttons
- Settings control: `locked_message_enabled` + per-type `locked_messages`
- Single-product optimization: CTA shows product name when exactly one active product exists

✅ **Offers Page**
- Card-based product display with name, pitch, description
- Access group lists with checkmark icons
- "Get access" CTA or "Contact support" fallback when Stripe not configured
- Success/cancel banners for checkout flow
- Empty state with support email when no products available

**Stripe Configuration:**
- Stripe keys still required for real checkout (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
- Products without `stripe_price_id` show contact-support CTA using `site_settings.support_email`
- Until Stripe is configured or products are added, offers page shows empty state

### Leftover / Not Implemented

- Pulse is a stub feed (no attachments, polls, voice, or rich interactions)
- **Content not seeded**: Document bodies start empty and are filled in through the admin editor
- **Attachments are URLs only**: No built-in file picker or upload (admins enter URLs)
- **No comments or reactions on documents**: Documents are read-only for members
- Real-time presence (active users list is static, refreshed on page load)
- Member-to-member DMs (only client-to-team DMs as per spec)
- Voice Room and Matchups (intentionally excluded per spec)
- GIF picker (excluded per spec)
- Nested/indented sidebar items (skipped if it exploded scope)

## License

Private repository - All rights reserved
