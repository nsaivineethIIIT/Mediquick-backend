#!/usr/bin/env python3
"""
Script to wrap all async exported functions with asyncHandler in controller files.
"""

import re
import os
from pathlib import Path

def wrap_async_functions(file_path):
    """Wrap all async exports with asyncHandler in a single file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if asyncHandler import exists
    has_import = 'asyncHandler = require(' in content
    
    # Pattern to match: exports.functionName = async (req, res
    # But not: exports.functionName = asyncHandler(async
    pattern = r'(exports\.\w+\s*=\s*)async\s*\((req,\s*res[^)]*)\)\s*=>'
    
    def replace_func(match):
        # Check if already wrapped
        start_pos = match.start()
        before = content[max(0, start_pos-50):start_pos]
        if 'asyncHandler(' in before:
            return match.group(0)  # Already wrapped, skip
        
        prefix = match.group(1)
        params = match.group(2)
        return f'{prefix}asyncHandler(async ({params}) =>'
    
    # Count matches before replacement
    matches = list(re.finditer(pattern, content))
    wrapped_count = len(matches)
    
    if wrapped_count == 0:
        return content, 0, has_import
    
    # Replace all matches
    new_content = re.sub(pattern, replace_func, content)
    
    # Now find and close the asyncHandler wrappers
    # We need to add closing ) after each function closing }; or };
    # This is trickier - need to match function boundaries
    
    # Pattern to find the end of wrapped functions
    # Look for }; or } at end of async functions we just wrapped
    lines = new_content.split('\n')
    result_lines = []
    in_wrapped_function = False
    brace_count = 0
    
    for i, line in enumerate(lines):
        result_lines.append(line)
        
        # Check if this line starts a wrapped function
        if 'asyncHandler(async' in line and '=> {' in line:
            in_wrapped_function = True
            brace_count = line.count('{') - line.count('}')
        elif in_wrapped_function:
            brace_count += line.count('{') - line.count('}')
            
            # If we've closed all braces and found };
            if brace_count == 0 and (line.strip() == '};' or line.strip().endswith('};')):
                # Replace }; with });
                result_lines[-1] = line.replace('};', '});')
                in_wrapped_function = False
    
    final_content = '\n'.join(result_lines)
    
    # Add asyncHandler import if not present
    if not has_import and wrapped_count > 0:
        # Find the last require statement in the file
        lines = final_content.split('\n')
        last_require_index = -1
        for i, line in enumerate(lines):
            if 'require(' in line and not line.strip().startswith('//'):
                last_require_index = i
        
        if last_require_index != -1:
            # Insert after last require
            lines.insert(last_require_index + 1, "const asyncHandler = require('../middlewares/asyncHandler');")
            final_content = '\n'.join(lines)
    
    return final_content, wrapped_count, has_import

def process_controllers():
    """Process all controller files."""
    controllers_dir = Path(__file__).parent / 'controllers'
    
    results = []
    
    # List of controller files to process
    controller_files = [
        'patientController.js',
        'doctorController.js',
        'appointmentController.js',
        'adminController.js',
        'supplierController.js',
        'employeeController.js',
        'orderController.js',
        'medicineController.js',
        'prescriptionController.js',
        'blogController.js',
        'reviewController.js',
        'chatController.js',
        'checkoutController.js',
        'cartController.js',
        'homeController.js'
    ]
    
    for filename in controller_files:
        file_path = controllers_dir / filename
        if not file_path.exists():
            print(f"⚠️  File not found: {file_path}")
            continue
        
        print(f"Processing {filename}...")
        new_content, count, had_import = wrap_async_functions(file_path)
        
        if count > 0:
            # Write back to file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            import_msg = " (import already present)" if had_import else " (added import)"
            print(f"✅ Wrapped {count} functions in {filename}{import_msg}")
            results.append((filename, count))
        else:
            print(f"ℹ️  No async functions to wrap in {filename}")
    
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    for filename, count in results:
        print(f"{filename}: {count} functions wrapped")
    print(f"\nTotal: {sum(c for _, c in results)} functions wrapped across {len(results)} files")

if __name__ == '__main__':
    process_controllers()
