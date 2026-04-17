/**
 * React Component Update Helper
 * 
 * This script helps update React components to use JWT authentication.
 * Run this in the browser console on each component file to get the updated code.
 */

const updateComponentForJWT = (componentCode) => {
    let updated = componentCode;
    
    // Step 1: Add import for authUtils if not present
    if (!updated.includes('authUtils')) {
        const importMatch = updated.match(/^(import.*?from.*?;?\n)+/);
        if (importMatch) {
            const lastImport = importMatch[0];
            const insertPoint = lastImport.length;
            updated = updated.slice(0, insertPoint) + 
                     "import { getToken, removeToken } from '../../utils/authUtils';\n" +
                     updated.slice(insertPoint);
        }
    }
    
    // Step 2: Replace credentials: 'include' with Authorization header
    updated = updated.replace(
        /credentials:\s*['"]include['"]/g,
        ''
    );
    
    // Step 3: Add Authorization header to fetch calls
    // Pattern 1: Simple headers
    updated = updated.replace(
        /headers:\s*{([^}]*?)}/g,
        (match, content) => {
            if (content.includes('Authorization')) return match;
            return `headers: {\n        'Authorization': \`Bearer \${getToken()}\`,${content}}`;
        }
    );
    
    // Pattern 2: Fetch calls without headers
    updated = updated.replace(
        /fetch\(([^,]+),\s*{([^}]*?)method:\s*['"](\w+)['"]/g,
        (match, url, beforeMethod, method) => {
            if (match.includes('headers')) return match;
            return `fetch(${url}, {\n        headers: {\n            'Authorization': \`Bearer \${getToken()}\`\n        },\n        ${beforeMethod}method: '${method}'`;
        }
    );
    
    // Step 4: Add 401 handling after fetch calls
    const fetch401Handler = `
        if (response.status === 401) {
            removeToken();
            window.location.href = '/patient/form'; // or '/doctor/form' for doctor components
            return;
        }
    `;
    
    // Add after response declarations
    updated = updated.replace(
        /(const response = await fetch\([^;]+\);)\n/g,
        `$1\n${fetch401Handler}\n`
    );
    
    // Step 5: Update logout handlers
    updated = updated.replace(
        /const\s+handleLogout\s*=\s*\(\)\s*=>\s*{[^}]*}/g,
        `const handleLogout = () => {
        removeToken();
        window.location.href = '/patient/form'; // or '/doctor/form'
    }`
    );
    
    return updated;
};

// Example usage:
// const updatedCode = updateComponentForJWT(originalComponentCode);
// console.log(updatedCode);

console.log('JWT Update Helper loaded. Use updateComponentForJWT(code) to transform components.');
