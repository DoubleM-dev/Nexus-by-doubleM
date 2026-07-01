# Nexus — Frontend Features & Required Backend APIs

Milestone 1 Deliverable: API Requirements Documentation
Mapped from existing frontend pages and components to required Express/MySQL backend endpoints.

---

## Summary Table

| Page / Feature                  | Backend Status                        | Priority |
|---------------------------------|---------------------------------------|----------|
| Login / Register                | Built — auth complete                 | Week 1   |
| Forgot / Reset Password         | Not built — needs email service       | Week 4   |
| Entrepreneur Profile            | Partial — GET/PUT built, public view missing | Week 1 |
| Investor Profile                | Partial — GET/PUT built, public view missing | Week 1 |
| Entrepreneur Dashboard          | Not built                             | Week 2   |
| Investor Dashboard              | Not built                             | Week 2   |
| Entrepreneurs Discovery Page    | Not built                             | Week 2   |
| Investors Discovery Page        | Not built                             | Week 2   |
| Chat / Messages                 | Not built                             | Week 3   |
| Deals                           | Not built                             | Week 3   |
| Documents                       | Not built                             | Week 3   |
| Notifications                   | Not built                             | Week 3   |
| Settings                        | Not built                             | Week 4   |
| Help                            | No backend needed — static content    | Week 4   |

---

## 1. Auth Pages — src/pages/auth/

### LoginPage.tsx

Handles email, password, and role-based login.

```
POST /api/auth/login
Body:    { email, password }
Returns: { token, user: { id, email, role, full_name } }
```

Status: Built and connected via AuthContext.

---

### RegisterPage.tsx

Handles new user registration with name, email, password, and role selection.

```
POST /api/auth/register
Body:    { full_name, email, password, role }
Returns: { token, user: { id, email, role, full_name } }
```

Status: Built, connected, and tested. Data confirmed in MySQL.

---

### ForgotPasswordPage.tsx

Submits an email address to trigger a password reset flow.

```
POST /api/auth/forgot-password
Body:    { email }
Returns: { message: 'Reset email sent' }
```

Status: Not built. Requires an email service such as Nodemailer before implementation.

---

### ResetPasswordPage.tsx

Accepts a reset token and a new password to complete the reset flow.

```
POST /api/auth/reset-password
Body:    { token, newPassword }
Returns: { message: 'Password updated' }
```

Status: Not built. Depends on forgot-password endpoint being completed first.

---

## 2. Profile Pages — src/pages/profile/

### EntrepreneurProfile.tsx

Displays and allows editing of entrepreneur profile fields including bio, startup name,
industry, funding needed, location, founding year, and team size.

```
GET /api/profile/me       — load own profile
PUT /api/profile/me       — update own profile
GET /api/profile/:id      — view another user's public profile
```

Database fields: bio, startup_name, startup_stage, industry, funding_needed, location, avatar_url

Status: GET and PUT for own profile are built. Public profile endpoint not yet built.

---

### InvestorProfile.tsx

Displays and allows editing of investor profile fields including bio, investment range,
preferred industries, and portfolio companies.

```
GET /api/profile/me       — load own profile
PUT /api/profile/me       — update own profile
GET /api/profile/:id      — view another user's public profile
```

Database fields: bio, investment_range_min, investment_range_max, preferred_industries,
past_investments, location, avatar_url

Status: Same as above — base endpoints built, public view endpoint not yet built.

---

## 3. Dashboard Pages — src/pages/dashboard/

### EntrepreneurDashboard.tsx

Overview of entrepreneur activity including funding progress, investor matches,
recent messages, and incoming collaboration requests.

```
GET /api/dashboard/entrepreneur
Returns: {
  profile_completion: number,
  total_investors_matched: number,
  pending_collaboration_requests: number,
  recent_messages: Message[],
  recent_notifications: Notification[]
}
```

Status: Not built. Requires collaboration and messaging tables to exist first.

---

### InvestorDashboard.tsx

Overview of investor activity including startups browsed, deals in progress,
messages, and portfolio summary.

```
GET /api/dashboard/investor
Returns: {
  total_startups_viewed: number,
  active_deals: number,
  pending_requests_sent: number,
  recent_messages: Message[],
  recent_notifications: Notification[]
}
```

Status: Not built.

---

## 4. Discovery Pages

### EntrepreneursPage.tsx — src/pages/entrepreneurs/

Allows investors to browse, search, and filter entrepreneur listings by industry,
funding stage, and location.

```
GET /api/entrepreneurs
Query params: ?industry=&stage=&location=&search=&page=&limit=
Returns: { entrepreneurs: EntrepreneurProfile[], total: number }
```

Database: users and profiles tables joined on user_id.

Status: Not built.

---

### InvestorsPage.tsx — src/pages/investors/

Allows entrepreneurs to browse and search investor listings filtered by
investment range and preferred industries.

```
GET /api/investors
Query params: ?industry=&min_investment=&max_investment=&search=&page=&limit=
Returns: { investors: InvestorProfile[], total: number }
```

Status: Not built.

---

## 5. Chat and Messages — src/pages/chat/ and src/pages/messages/

### ChatPage.tsx and MessagesPage.tsx

Real-time one-to-one messaging between an investor and an entrepreneur.

```
GET  /api/conversations                   — list all conversations for current user
GET  /api/conversations/:id/messages      — get messages in a conversation
POST /api/conversations/:id/messages      — send a message
POST /api/conversations                   — start a new conversation
```

Database tables required:

```sql
CREATE TABLE conversations (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  participant_1 INT NOT NULL,
  participant_2 INT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_1) REFERENCES users(id),
  FOREIGN KEY (participant_2) REFERENCES users(id)
);

CREATE TABLE messages (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_id       INT NOT NULL,
  content         TEXT NOT NULL,
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);
```

Components used: ChatMessage.tsx, ChatUserList.tsx

Status: Not built. Real-time delivery will require Socket.io, planned for Week 3.

---

## 6. Deals Page — src/pages/deals/

### DealsPage.tsx

Tracks collaboration and investment deal requests between investors and entrepreneurs,
showing current status as pending, accepted, or rejected.

```
GET    /api/deals               — list deals for current user
POST   /api/deals               — create a new deal or collaboration request
PUT    /api/deals/:id/status    — accept or reject a deal
DELETE /api/deals/:id           — cancel a deal
```

Database table required:

```sql
CREATE TABLE deals (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  investor_id      INT NOT NULL,
  entrepreneur_id  INT NOT NULL,
  message          TEXT,
  status           ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (investor_id) REFERENCES users(id),
  FOREIGN KEY (entrepreneur_id) REFERENCES users(id)
);
```

Components used: CollaborationRequestCard.tsx

Status: Not built.

---

## 7. Documents Page — src/pages/documents/

### DocumentsPage.tsx

Allows users to upload, view, and share documents such as pitch decks,
financial statements, and NDAs.

```
GET    /api/documents              — list documents for current user
POST   /api/documents/upload       — upload a document (multipart/form-data)
DELETE /api/documents/:id          — delete a document
PUT    /api/documents/:id/share    — toggle sharing with another user
```

Database table required:

```sql
CREATE TABLE documents (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  owner_id     INT NOT NULL,
  name         VARCHAR(255) NOT NULL,
  file_url     VARCHAR(500) NOT NULL,
  file_type    VARCHAR(50),
  file_size    VARCHAR(50),
  is_shared    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

Additional requirement: File storage solution (local disk or cloud such as AWS S3 or
Cloudinary) and the multer package for handling multipart uploads.

Status: Not built.

---

## 8. Notifications Page — src/pages/notifications/

### NotificationsPage.tsx

Displays user alerts for new messages, incoming deal requests, profile views,
and collaboration status changes.

```
GET /api/notifications             — list notifications for current user
PUT /api/notifications/:id/read    — mark a single notification as read
PUT /api/notifications/read-all    — mark all notifications as read
```

Database table required:

```sql
CREATE TABLE notifications (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  type         VARCHAR(50) NOT NULL,
  message      TEXT NOT NULL,
  is_read      BOOLEAN DEFAULT FALSE,
  reference_id INT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

Note: Notifications should be generated automatically on the server side whenever
a deal, message, or profile event occurs.

Status: Not built.

---

## 9. Settings Page — src/pages/settings/

### SettingsPage.tsx

Allows users to change their password, update notification preferences,
and delete their account.

```
PUT    /api/settings/password           — change password
PUT    /api/settings/notifications      — update notification preferences
DELETE /api/settings/account            — delete account permanently
```

Status: Not built.

---

## 10. Help Page — src/pages/help/

### HelpPage.tsx

Displays FAQ and support content. No backend integration required unless a
contact support form is added in a later milestone.

Status: No backend needed.

---

## Recommended Build Order

```
Week 1   Auth (register, login) and profile GET/PUT          — complete
Week 2   Discovery listings and dashboard summary APIs
Week 3   Deals, messaging, and notifications
Week 4   Document uploads, settings, and password reset
```

---

## Components and Their Required Data Sources

| Component                    | API Required                              |
|------------------------------|-------------------------------------------|
| EntrepreneurCard.tsx         | GET /api/entrepreneurs                    |
| InvestorCard.tsx             | GET /api/investors                        |
| CollaborationRequestCard.tsx | GET /api/deals                            |
| ChatMessage.tsx              | GET /api/conversations/:id/messages       |
| ChatUserList.tsx             | GET /api/conversations                    |
| Navbar.tsx                   | Current user from AuthContext — no API    |
| Sidebar.tsx                  | Current user role from AuthContext — no API |
