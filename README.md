<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# בונה מהלכי הוראה - רשתות מילים סמנטיות

אפליקציה ליצירת מפות מילים סמנטיות ופעילויות מותאמות אישית.

# Semantic Word Maps and Custom Activities Builder

An application for creating semantic word maps and personalized activities.

## הרצה מקומית / Run Locally

**דרישות מוקדמות / Prerequisites:** Node.js

1. התקנת תלויות / Install dependencies:
   ```bash
   npm install
   ```

2. הגדרת מפתח API / Set API key:
   - צרו קובץ `.env.local` / Create `.env.local` file
   - הוסיפו את המפתח שלכם / Add your API key:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

3. הרצת האפליקציה / Run the app:
   ```bash
   npm run dev
   ```

## פרסום ב-GitHub Pages / Deploy to GitHub Pages

### שלב 1: העלאה ל-GitHub / Step 1: Upload to GitHub

1. צרו repository חדש ב-GitHub / Create a new repository on GitHub
2. העלו את הקוד / Upload the code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

### שלב 2: הגדרת GitHub Pages / Step 2: Configure GitHub Pages

1. לכו ל-Settings של ה-repository / Go to repository Settings
2. בחרו ב-Pages מהתפריט השמאלי / Select Pages from the left menu
3. תחת "Source" בחרו "GitHub Actions" / Under "Source" select "GitHub Actions"
4. שמרו את השינויים / Save changes

### שלב 3: הגדרת מפתח API / Step 3: Configure API Key

1. לכו ל-Settings > Secrets and variables > Actions / Go to Settings > Secrets and variables > Actions
2. לחצו על "New repository secret" / Click "New repository secret"
3. הוסיפו:
   - Name: `GEMINI_API_KEY`
   - Value: המפתח API שלכם / Your API key
4. לחצו "Add secret" / Click "Add secret"

### שלב 4: פרסום / Step 4: Deploy

1. לאחר ההעלאה, ה-workflow יופעל אוטומטית / After pushing, the workflow will run automatically
2. לכו ל-Actions כדי לראות את התהליך / Go to Actions to see the process
3. לאחר השלמת ה-build, האפליקציה תהיה זמינה ב:
   / After build completion, the app will be available at:
   ```
   https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
   ```

## הערות חשובות / Important Notes

- **מפתח API**: ודאו שהמפתח מוגדר כ-Secret ב-GitHub / **API Key**: Make sure the key is set as a Secret in GitHub
- **שם ה-repository**: אם שם ה-repository שונה, עדכנו את `GITHUB_PAGES_BASE` ב-`vite.config.ts` / **Repository name**: If the repository name is different, update `GITHUB_PAGES_BASE` in `vite.config.ts`
