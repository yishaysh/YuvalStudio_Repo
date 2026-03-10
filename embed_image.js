import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// הגדרת הנתיבים
const imagePath = path.join(__dirname, 'feature_screenshot.png');
const htmlPath = path.join(__dirname, 'feature_release_notes.html');
const outputPath = path.join(__dirname, 'feature_release_notes_ready.html');

try {
    // שלב 1: בדיקה אם קובץ התמונה קיים
    if (!fs.existsSync(imagePath)) {
        console.error('❌ שגיאה: הקובץ feature_screenshot.png לא נמצא בתיקייה שבה הרצת את הסקריפט.');
        console.error('אנא הוסף את צילום המסך לתיקייה ונסה שוב.');
        process.exit(1);
    }

    // שלב 2: קריאת התמונה והמרתה ל-Base64
    const imgBuffer = fs.readFileSync(imagePath);
    // לקיחת הסיומת כדי לדעת איזה סוג תמונה זה (למרות שברירת המחדל היא png)
    const ext = path.extname(imagePath).substring(1) || 'png';
    const base64Image = `data:image/${ext};base64,${imgBuffer.toString('base64')}`;

    console.log('✅ התמונה הומרה ל-Base64 בהצלחה.');

    // שלב 3: קריאת קובץ ה-HTML 
    if (!fs.existsSync(htmlPath)) {
        console.error('❌ שגיאה: הקובץ feature_release_notes.html לא נמצא.');
        process.exit(1);
    }
    
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    // שלב 4: החלפת הקישור לתמונה בקוד ה-Base64
    // אנחנו מחפשים בדיוק את המחרוזת "./feature_screenshot.png" שנמצאת בקובץ המקורי
    htmlContent = htmlContent.replace(/src="\.\/feature_screenshot\.png"/g, `src="${base64Image}"`);
    
    // מחיקת ההסבר של "איך לשים תמונה"
    htmlContent = htmlContent.replace(/<div class="screenshot-placeholder"[\s\S]*?<\/div>/g, '');

    // שלב 5: שמירת הקובץ המוכן לשליחה
    fs.writeFileSync(outputPath, htmlContent, 'utf-8');
    
    console.log(`🎉 סיום! הקובץ המוכן לשליחה נוצר בהצלחה ונמצא כאן:`);
    console.log(`👉 ${outputPath}`);
    console.log(`כעת תוכל לשלוח ליובל את הקובץ 'feature_release_notes_ready.html' בלבד, והתמונה תהיה בתוכו.`);

} catch (err) {
    console.error('❌ שגיאה בלתי צפויה:', err);
}
