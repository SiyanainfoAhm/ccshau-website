# Power Automate: Shared mailbox → Teams files (`.eml`)

**Goal:** Jab shared mailbox par naya email aaye, Teams **Shared / Documents** mein yeh structure banaye / use kare aur email `.eml` file upload kare:

```
Documents/
  HCMS/                 ← email ke @ se pehle wala part (hcms@… → HCMS)
    Communication/
      <Subject>.eml     ← har email ki alag file
```

**Test mailbox:** `hcms@siyanainfo.com` → folder `HCMS`  
**Test Team / Channel files:** Team `Siyana` → channel `SiyanaWonTenders` → **Shared** tab (SharePoint library)

Conversation mein HTML message **mat** bhejo — pehle jo raw `<p><strong>…` dikha, woh hata sakte ho.

---

## Flow outline (single email — simple)

| # | Action | Purpose |
|---|--------|---------|
| 1 | **When a new email arrives in a shared mailbox (V2)** | Trigger |
| 2 | **Compose** (or **Initialize variable**) | Prefix = `@` se pehle (`HCMS`) |
| 3 | **Export email (V2)** | Email ko `.eml` binary banao |
| 4 | **Create new folder** (SharePoint) | `HCMS` (agar pehle se hai to ignore / continue) |
| 5 | **Create new folder** (SharePoint) | `HCMS/Communication` |
| 6 | **Create file** (SharePoint) | `.eml` upload into `HCMS/Communication` |

Optional: Conversation post hata do, ya sirf short plain-text link rakho.

---

## Array of emails → split → folder (recommended)

Ek string ki jagah **email array** rakho. Har item pe `@` se pehle wala part = folder name.

Example array:

```json
[
  "hcms@siyanainfo.com",
  "webportal@hau.ac.in",
  "computer.section@hau.ac.in"
]
```

Folder mapping:

| Email | Folder |
|-------|--------|
| `hcms@siyanainfo.com` | `HCMS/Communication/` |
| `webportal@hau.ac.in` | `WEBPORTAL/Communication/` |
| `computer.section@hau.ac.in` | `COMPUTER.SECTION/Communication/` |

### Flow steps

```
1. Trigger — When a new email arrives in a shared mailbox (V2)
2. Export email (V2)                         ← .eml content ek baar
3. Initialize variable  AllowedEmails (Array)
4. Apply to each  (AllowedEmails)
     ├─ Compose / Set variable  Prefix = toUpper(first(split(item(), '@')))
     ├─ Create new folder       /{Prefix}
     ├─ Create new folder       /{Prefix}/Communication
     └─ Create file             /{Prefix}/Communication/<name>.eml
```

### 3a. Initialize variable — email array

| Field | Value |
|-------|--------|
| Name | `AllowedEmails` |
| Type | **Array** |
| Value | See below |

**Value** (switch to raw / expression input if needed):

```json
["hcms@siyanainfo.com","webportal@hau.ac.in","computer.section@hau.ac.in"]
```

Power Automate UI mein **Initialize variable** → Type **Array** → Value:

```
createArray('hcms@siyanainfo.com','webportal@hau.ac.in','computer.section@hau.ac.in')
```

### 3b. Apply to each

**+ New step** → **Apply to each**  
**Select output:** `AllowedEmails` (variable)

### 3c. Inside loop — split to folder name

**Compose** (name: `FolderPrefix`) — Expression:

```
toUpper(first(split(items('Apply_to_each'), '@')))
```

Agar Apply to each ka internal name alag ho (e.g. `Apply_to_each_2`), Expression tab se `items(...)` dynamic content **Current item** use karo:

```
toUpper(first(split(item(), '@')))
```

→ `hcms@siyanainfo.com` → `HCMS`

### 3d. Inside loop — folders + file

Same SharePoint actions as single-email flow, lekin paths variable se:

| Action | Path / Name |
|--------|-------------|
| Create folder | Name = outputs from `FolderPrefix` (`HCMS`) |
| Create folder | Path `/HCMS` (use Compose output), Name = `Communication` |
| Create file | Folder Path = `/@{outputs('FolderPrefix')}/Communication` |
| File Content | **Export email** output (loop ke bahar wala step — same content har folder mein copy) |
| File Name | `concat('Email_', formatDateTime(utcNow(), 'yyyyMMdd_HHmmss'), '.eml')` |

> **Note:** Loop mein har allowed email ke folder mein **same** `.eml` copy hogi. Agar sirf **jis mailbox pe mail aayi** usi folder mein chahiye, neeche “Match only incoming mailbox” dekho.

### Match only incoming mailbox (array se find)

Array = allowed list. Sirf us email ka folder banao jo is run ke shared mailbox se match kare.

1. Variable `AllowedEmails` (array) — same as above  
2. Variable `MatchedPrefix` (string) — empty  
3. **Apply to each** `AllowedEmails`  
4. **Condition:**  
   `toLower(items(...))` **is equal to** `toLower('<shared-mailbox-address>')`  
   (ya trigger mailbox address, jab available ho)  
5. **If yes:**  
   `Set variable MatchedPrefix = toUpper(first(split(item(), '@')))`  
6. Loop ke **baad** (ek baar):  
   Create folders + Create file using `MatchedPrefix` only  

Isse `hcms@…` pe aayi mail → sirf `HCMS/Communication/`, baaki array entries skip.

### Split expression cheat-sheet

| Need | Expression |
|------|------------|
| Prefix from one string | `toUpper(first(split('hcms@siyanainfo.com', '@')))` |
| Prefix from current array item | `toUpper(first(split(item(), '@')))` |
| Domain (after @) | `last(split(item(), '@'))` |
| Compare emails (case-insensitive) | `equals(toLower(item()), toLower('hcms@siyanainfo.com'))` |

---

## Step-by-step

### 1. Trigger (already done)

- **When a new email arrives in a shared mailbox (V2)**
- **Original Mailbox Address:** `HCMS` / `hcms@siyanainfo.com`
- Advanced (recommended for export):
  - **Include Attachments:** Yes (optional)
  - Leave Folder as Inbox unless rules move mail elsewhere

### 2. Get mailbox prefix (`HCMS`)

**+ New step** → **Compose** (Data Operation)

**Inputs** — Expression:

```
toUpper(first(split('hcms@siyanainfo.com', '@')))
```

Test ke liye hardcode theek hai. Baad mein university mailbox pe yeh string change kar dena, ya dynamic:

```
toUpper(first(split(triggerOutputs()?['body/toRecipients']?[0]?['emailAddress']?['address'], '@')))
```

(To recipients kabhi empty ho sakta hai — isliye pehle hardcode + variable safer hai.)

Better long-term: **Initialize variable**

| Field | Value |
|-------|--------|
| Name | `MailboxPrefix` |
| Type | String |
| Value | Expression: `toUpper(first(split('hcms@siyanainfo.com', '@')))` |

→ Result: `HCMS`

### 3. Export email as `.eml`

**+ New step** → Office 365 Outlook → **Export email (V2)**

| Field | Value |
|-------|--------|
| Message Id | Dynamic: **Message Id** from trigger |
| Mailbox address | Same shared mailbox (`hcms@siyanainfo.com` / HCMS) |

Output = file content for `.eml`.

> Agar **Export email (V2)** list mein na dikhe: search **Export email**. Alternate: **Get email (V2)** + Graph MIME — IT se confirm. Prefer Export.

### 4. SharePoint site for the Teams channel

Channel **SiyanaWonTenders** → **Shared** = SharePoint document library.

In SharePoint actions:

| Field | How to pick |
|-------|-------------|
| **Site Address** | Enter custom value **or** pick the Team site (often looks like `https://<tenant>.sharepoint.com/sites/...`) |
| **Library** | `Documents` / `Shared Documents` |

Tip: Teams mein Shared tab → browser mein “Open in SharePoint” → URL copy karke Site Address mein paste.

### 5. Create folder `HCMS`

**Create new folder** (SharePoint)

| Field | Value |
|-------|--------|
| Site Address | Team site |
| List or Library | Documents |
| Folder Path | `/` or blank (library root) |
| Folder Name | `@{variables('MailboxPrefix')}` → `HCMS` |

**Already exists:**  
Click **…** on this action → **Configure run after** → also enable **has failed** / treat “folder exists” as success, **or** use:

- **Get folder metadata using path** with path `/HCMS`
- **Condition**: if failed → Create folder

Simplest for test: create `HCMS` manually once in Shared, then flow only creates `Communication` + file. For full auto, use Configure run after so “folder exists” does not stop the flow.

### 6. Create folder `Communication`

**Create new folder**

| Field | Value |
|-------|--------|
| Folder Path | `/@{variables('MailboxPrefix')}` → `/HCMS` |
| Folder Name | `Communication` |

Same “already exists” handling as above.

### 7. Upload `.eml` file

**Create file** (SharePoint)

| Field | Value |
|-------|--------|
| Site Address | Same Team site |
| Folder Path | `/@{variables('MailboxPrefix')}/Communication` |
| File Name | See below |
| File Content | Dynamic content from **Export email** → body / file content |

**File Name** expression (safe subject + unique stamp):

```
concat(
  replace(replace(replace(coalesce(triggerOutputs()?['body/subject'], 'email'), '/', '-'), '\', '-'), ':', '-'),
  '_',
  formatDateTime(utcNow(), 'yyyyMMdd_HHmmss'),
  '.eml'
)
```

Shorter option:

```
concat('Email_', formatDateTime(utcNow(), 'yyyyMMdd_HHmmss'), '.eml')
```

Har email = **nayi file** same `HCMS/Communication` folder mein (jaise aapke existing `.eml` files).

### 8. Remove / fix the Teams chat message

Pehle wala **Post message in a chat or channel** HTML tags dikha raha tha.

Options:

1. **Delete** that action (recommended — sirf file upload).  
2. Ya message ko **plain text** rakho (no `<p>` / `<strong>`):

```
New mail saved
From: @{triggerOutputs()?['body/from']}
Subject: @{triggerOutputs()?['body/subject']}
Path: HCMS/Communication/
```

---

## Final canvas (recommended)

```
1. When a new email arrives in a shared mailbox (V2)
2. Initialize variable  MailboxPrefix = HCMS
3. Export email (V2)
4. Create new folder     /HCMS
5. Create new folder     /HCMS/Communication
6. Create file           /HCMS/Communication/<name>.eml
```

---

## Test checklist

1. Shared tab mein manually confirm path ban sakta hai: `HCMS` → `Communication` (optional seed).  
2. Flow **Save** → **Test** → Manually.  
3. `hcms@siyanainfo.com` par naya test mail bhejo.  
4. Run history **Succeeded**.  
5. Teams → **SiyanaWonTenders** → **Shared** → `HCMS` → `Communication` → naya `.eml` dikhe.  
6. Conversation mein raw HTML **na** aaye.

---

## University pe switch (baad mein)

| Change | Update |
|--------|--------|
| Shared mailbox | Trigger + Export mailbox address |
| `MailboxPrefix` | `toUpper(first(split('new@hau.ac.in', '@')))` |
| Site / Channel | Naya Team site + library path |

Logic same: `{prefix}/Communication/{email}.eml`

---

## Common errors

| Error | Fix |
|-------|-----|
| Folder already exists | Configure run after / create folders once manually |
| Access denied SharePoint | Flow account = Team member with edit rights |
| Export email fails | Same mailbox address on Export as Trigger; Full Access on shared mailbox |
| File name invalid | Strip `\ / : * ? " < > \|` from subject |
| Wrong library | Use Open in SharePoint URL; path often under `Shared Documents` |

---

## Note vs website flows

Yeh flow **inbox → Teams files** hai. Website ka `POWER_AUTOMATE_EMAIL_URL` (password reset / lockout) alag rahega — mix mat karo.
