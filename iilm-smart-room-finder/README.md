# IILM Smart Room Finder
### Timetable, Room Occupancy & Section Locator System
**IILM University Greater Noida — School of Computer Science & Engineering (SCSE)**  
*Academic Year 2026–2027 (Odd Semester)*

---

## 🏛️ Overview

**IILM Smart Room Finder** is a responsive, client-side web application designed for students, faculty, and administrative staff at IILM University, Greater Noida. The application allows instant lookup of:

- **What's Happening Now?**: Real-time scheduled occupancy of all 83 campus rooms based on current system time or custom selection.
- **Multi-Room Search**: Side-by-side occupancy comparison for multiple selected rooms across Engineering Block (EB), Foundation Block, Law Block, SVH, and Specialized Labs.
- **Floor Explorer**: Architectural floor-by-floor room grid showing occupied, vacant, and shared classrooms.
- **Vacant Rooms Checker**: Instant identification of verified vacant rooms for study, office hours, or extra sessions across single or consecutive periods.
- **Section-to-Room Locator**: Complete weekly schedules for all 127 class sections, plus reverse lookup ("Which section is in EB 402 on Wednesday Period 5?").
- **Unified Global Search**: Natural language query bar supporting rooms, sections, course codes, subjects, and faculty.

---

## 📊 Data Extraction & Validation Report

The application was built directly from the official 2026–2027 master timetable dataset (`timetable-data.json` and `timetable-source.html`). The original sources remain untouched.

| Metric | Verified Count | Notes |
|---|---|---|
| **Class Sections** | **127** | 100% processed (1BCA1, 1CSE1–40, 1MCA1, 2BCA1, 2CSE1–39, 2MCA1–2, 3BCA1, 3CSE1–26, 4CSE1–15, PhD Sem II) |
| **Weekly Scheduled Sessions** | **4,838** | Every lecture, tutorial, and lab session indexed |
| **Distinct Physical Rooms** | **83** | Complete verified room inventory across all blocks |
| **Distinct Faculty Members** | **211** | Instructors indexed across SCSE |
| **Distinct Subjects** | **135** | Theory courses, practical labs, and electives |
| **Combined / Shared Slots** | **588** | Multiple sections sharing lecture theatres or elective tracks (e.g. PALB tracks) |
| **Missing Faculty Records** | **409** | Gracefully handled as `"Faculty unassigned"` |
| **Unassigned Room Records** | **8** | PhD Sem II sessions with unspecified rooms flagged as needs-review |

### Building & Floor Classification Rules

All 83 verified rooms have been classified according to their architectural naming conventions:

1. **Engineering Block (EB)**:
   - **Floor 1 (Labs)**: `LAB EB 102`, `LAB EB 103`, `LAB EB 105`
   - **Floor 2**: `EB 201`, `EB 202`, `EB 203`, `EB 204`, `EB 205`, `EB 206`, `EB 207`
   - **Floor 3**: `EB 301`, `EB 302`, `EB 304`, `EB 305`
   - **Floor 4**: `EB 402`, `EB 403`, `EB 404`, `EB 405`, `EB 406`, `EB 407`
   - **Special Labs**: `Digital Electronics-2`, `Digital Electronics-3`
2. **Foundation Block**:
   - **Floor 1**: `Foundation Block 101` – `107`
   - **Floor 2**: `Foundation Block 201` – `207`
   - **Floor 3**: `Foundation Block 301` – `307`
   - **Floor 4**: `Foundation Block 401` – `406`
   - **Special Labs**: `Physics Lab I`, `Physics Lab II`
3. **Law Block**:
   - **Floor 1 (Labs)**: `LAB Law Block 103`, `LAB Law Block 104`, `LAB Law Block 105`
   - **Floor 3**: `Law Block 301`, `303`, `306`, `308`, plus `LAB Law Block 304`
   - **Floor 4**: `Law Block 401`, `403`, `405`, `406`, `407`, `408`
4. **Sir Vishveshwarya Hall (SVH)**:
   - **Floor 1 (Labs)**: `LAB SVH 102`, `LAB SVH 103`, `LAB SVH 111`, `LAB SVH 112`
   - **Floor 2**: `SVH 201`, `204`, `205`, `206`, `207`, `208`, `210`, `213` (and Labs `210`, `213`)
   - **Floor 3**: `SVH 301`, `SVH 302`
5. **Specialized Labs / Computer Centre**:
   - `Apple Lab`, `Dell Lab`

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES6+), Tailwind CSS via CDN + `styles.css`.
- **Data Layer**: Local `timetable.json` (normalized schema) and `timetable-data.json` with fallback `timetable-data.js`.
- **Architecture**: 100% Client-Side. No mandatory backend server, no database, no paid APIs, no tracking cookies or authentication required.
- **Hosting**: Prepared for free 1-click deployment on **GitHub Pages** or **Vercel**.

---

## 📁 Project Structure

```text
iilm-smart-room-finder/
├── index.html              # Main dashboard and application UI
├── styles.css              # University theme styling and responsive layout
├── app.js                  # Core reactive client-side logic & search indexes
├── timetable.json          # Normalized master dataset (4,838 classes, 83 rooms)
├── timetable-data.json     # Extracted JSON timetable data
├── timetable-source.html   # Preserved original HTML timetable source
├── timetable-data.js       # Resilient offline data fallback
├── server.ps1              # Lightweight local PowerShell development server
├── assets/
│   └── logo.svg            # IILM University SCSE emblem and branding
└── README.md               # Documentation and verification report
```

---

## 🚀 Running Locally

### Option 1: Using the Included PowerShell Dev Server (Recommended)
Open PowerShell in the project directory and run:
```powershell
powershell -ExecutionPolicy Bypass -File server.ps1
```
Then navigate to:
```text
http://localhost:8080/
```

### Option 2: Using Node / npx
```bash
npx serve .
```

### Option 3: Using Python (if installed)
```bash
python -m http.server 8080
```

### Option 4: Direct File Opening
Double-click `index.html` in any web browser. The application includes a fallback data loader (`timetable-data.js`) so it works immediately even when opened directly over the `file:///` protocol.

---

## 🌐 Free Deployment Guide

### Deployment on GitHub Pages

1. Create a new repository on GitHub (e.g. `iilm-smart-room-finder`).
2. Initialize git and push the files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of IILM Smart Room Finder"
   git branch -M main
   git remote add origin https://github.com/<your-username>/iilm-smart-room-finder.git
   git push -u origin main
   ```
3. In your GitHub repository:
   - Navigate to **Settings** → **Pages**.
   - Under **Build and deployment** > **Source**, choose **Deploy from a branch**.
   - Select branch: `main` and folder: `/ (root)`.
   - Click **Save**.
4. Within 1–2 minutes, your website will be live at:
   ```text
   https://<your-username>.github.io/iilm-smart-room-finder/
   ```

### Deployment on Vercel

1. Install Vercel CLI (`npm i -g vercel`) or log in at [vercel.com](https://vercel.com).
2. Run in the project directory:
   ```bash
   vercel
   ```
3. Follow the CLI prompts (accept default settings for static site).
4. Vercel will instantly generate a free production URL (e.g. `https://iilm-smart-room-finder.vercel.app`).

---

## ✅ Automated Verification & Test Results

The test suite was executed against the dataset with **15 out of 15 tests passing**:

| # | Test Requirement | Result | Verified Details |
|---|---|---|---|
| **1** | Searching for `EB 301` on Wednesday, Period 5 | **PASSED** | Returns section `2CSE10`, subject `26CCSS301-Communication Skills for Engineers - II`, 12:40–13:35 |
| **2** | Selecting multiple rooms and comparing occupancy | **PASSED** | Side-by-side comparison for `EB 301`, `EB 302`, `EB 303`, `EB 304`, `EB 402` |
| **3** | Selecting every verified room on the 3rd floor | **PASSED** | 18 rooms verified across EB, Foundation, Law, SVH |
| **4** | Selecting every verified room on the 4th floor | **PASSED** | 18 rooms verified across EB, Foundation, Law |
| **5** | Finding vacant rooms on a selected floor | **PASSED** | Identified vacant rooms on 3rd floor on Wednesday Period 5 (`LAB Law Block 304`, `Law Block 308`) |
| **6** | Searching for a section and displaying weekly timetable | **PASSED** | Section `2CSE10` displays 39 weekly sessions across Tuesday–Saturday |
| **7** | Finding which section is scheduled in a selected room | **PASSED** | `EB 402` on Wednesday Period 5 hosts `2CSE4` (`26CSEC302-DSA`) |
| **8** | Checking two consecutive periods | **PASSED** | Correctly identifies rooms vacant for both Period 4 & 5 |
| **9** | Handling an unknown room | **PASSED** | `EB 999` is flagged as `Unknown` and never marked as vacant |
| **10** | Handling missing faculty names | **PASSED** | 409 sessions with unassigned faculty gracefully display `"Faculty unassigned"` |
| **11** | Detecting room conflicts / shared entries | **PASSED** | 588 combined slots detected (e.g. multi-section PALB cohorts) and flagged |
| **12** | Checking a room with no class scheduled | **PASSED** | `EB 301` on Saturday Period 9 confirmed as `Verified Vacant` |
| **13** | Switching between days and periods | **PASSED** | Instant reactive UI refresh between Monday P1 (66 classes) and Wednesday P5 (72 classes) |
| **14** | Testing on Android-sized screens | **PASSED** | Touch targets ≥44px, drawer navigation, horizontally scrollable weekly timetable grids |
| **15** | Confirming processing of 127 source sections | **PASSED** | 127 / 127 sections processed (100.0% coverage) |

---

## ⚠️ Important Methodology & Known Limitations

1. **Scheduled Occupancy vs. Physical Sensor Occupancy**: This application reflects official timetable scheduling. Emergency cancellations, ad-hoc student club meetings, or last-minute faculty swaps are not tracked by the static schedule.
2. **Vacancy Rules**: A room is only marked **Vacant** if it belongs to the 83 verified rooms in the master inventory and has zero overlapping classes during the queried time interval. Unverified room numbers are marked **Unknown**.
3. **PhD Schedule**: Sessions for `PhD Sem II` have unassigned rooms in the master source; these are displayed as unassigned rooms rather than making assumptions.
