# Verification and Testing Plan

## Overview

This document provides comprehensive testing procedures to verify the application works correctly after discussion removal.

## Testing Philosophy

1. **Preserved features must work perfectly**
2. **No errors or warnings in logs**
3. **Performance should be same or better**
4. **User experience should be seamless**

## Phase 1: Pre-Deployment Testing

### 1.1 Development Environment Tests

#### Unit Tests

```bash
# Run all tests
pytest

# Run tests for specific apps
pytest search/
pytest course_catalog/
pytest profiles/
pytest authentication/

# Check test coverage
pytest --cov=. --cov-report=html
# Target: >80% coverage for preserved features
```

**Expected Results**:
- All tests pass ✓
- No discussion-related test failures
- Coverage meets threshold
- No warnings about missing imports

#### Integration Tests

```bash
# Test API endpoints
pytest -m integration

# Test database operations
pytest -m database

# Test search functionality
pytest -m search
```

### 1.2 Frontend Tests

```bash
cd frontends/open-discussions

# Run Jest tests
npm test

# Run with coverage
npm test -- --coverage

# Check for console errors
npm run lint

# Type checking (if using TypeScript)
npm run type-check
```

**Expected Results**:
- All tests pass ✓
- No import errors
- No undefined references
- Coverage meets threshold

### 1.3 Build Tests

```bash
# Backend build test
python manage.py check
python manage.py check --deploy

# Frontend build test
cd frontends/open-discussions
npm run build

# Verify build artifacts
ls -la build/
```

**Expected Results**:
- No errors during build
- Build completes successfully
- Assets generated correctly

## Phase 2: Functional Testing

### 2.1 Search Functionality

#### Test Case: Basic Search

```bash
# API test
curl -X GET "http://localhost:8000/api/v0/search/?q=python"

# Expected: Results for courses, podcasts, videos (NO posts/comments)
```

**Manual Test**:
1. Navigate to search page
2. Enter search term
3. Verify results display correctly
4. Check filters work (type, topic, etc.)
5. Verify sorting works
6. Test pagination

**Acceptance Criteria**:
- [ ] Search returns results for preserved types
- [ ] No errors for removed types
- [ ] Filters work correctly
- [ ] Results display properly
- [ ] Pagination works
- [ ] Performance acceptable (<2s response)

#### Test Case: Podcast Search

```bash
curl -X GET "http://localhost:8000/api/v0/search/?q=technology&type=podcast"
```

**Manual Test**:
1. Search for podcasts
2. Click on podcast result
3. Verify podcast page loads
4. Check episode list
5. Test episode playback

**Acceptance Criteria**:
- [ ] Podcast results display
- [ ] Podcast detail page works
- [ ] Episodes load correctly
- [ ] Audio playback works
- [ ] Metadata displays correctly

#### Test Case: Course Search

```bash
curl -X GET "http://localhost:8000/api/v0/search/?q=computer&type=course"
```

**Manual Test**:
1. Search for courses
2. Filter by platform
3. Sort by relevance/date
4. Click on course result
5. Verify course detail page

**Acceptance Criteria**:
- [ ] Course results display
- [ ] Filtering works
- [ ] Sorting works
- [ ] Course details load
- [ ] Related courses shown

### 2.2 Podcast Features

#### Test Case: Browse Podcasts

**Manual Test**:
1. Navigate to /podcasts/
2. Verify podcast list displays
3. Test filtering
4. Test sorting
5. Test search within podcasts

**Acceptance Criteria**:
- [ ] Podcast list loads
- [ ] Pagination works
- [ ] Filters apply correctly
- [ ] Images display
- [ ] Links work

#### Test Case: Podcast Detail

**Manual Test**:
1. Open specific podcast
2. View episodes
3. Play audio
4. Check show notes
5. Test related podcasts

**Acceptance Criteria**:
- [ ] Podcast details display
- [ ] Episode list loads
- [ ] Audio player works
- [ ] Episode metadata correct
- [ ] Related podcasts shown

### 2.3 Course Features

#### Test Case: Browse Courses

**Manual Test**:
1. Navigate to /courses/
2. Browse course list
3. Apply filters
4. Test search
5. View course details

**Acceptance Criteria**:
- [ ] Course list displays
- [ ] Filters work (topic, level, etc.)
- [ ] Search within courses works
- [ ] Images load
- [ ] Pagination works

#### Test Case: Learning Paths

**Manual Test**:
1. Navigate to /learn/
2. View learning paths
3. Create new list
4. Add items to list
5. Share list

**Acceptance Criteria**:
- [ ] Learning paths display
- [ ] Can create new lists
- [ ] Can add courses/podcasts
- [ ] Can edit lists
- [ ] Sharing works

### 2.4 User Profile Features

#### Test Case: Profile View

**Manual Test**:
1. Navigate to user profile
2. View profile information
3. Check learning lists
4. Verify favorites

**Expected**: NO posts or comments sections

**Acceptance Criteria**:
- [ ] Profile displays correctly
- [ ] User info shown
- [ ] Learning lists work
- [ ] Favorites display
- [ ] NO discussion history shown
- [ ] Edit profile works

#### Test Case: Profile Edit

**Manual Test**:
1. Click edit profile
2. Update name, bio, avatar
3. Save changes
4. Verify updates persist

**Acceptance Criteria**:
- [ ] Edit form loads
- [ ] Can update all fields
- [ ] Changes save correctly
- [ ] Avatar upload works
- [ ] Validation works

### 2.5 Authentication

#### Test Case: Login

**Manual Test**:
1. Logout
2. Navigate to login
3. Enter credentials
4. Login

**Acceptance Criteria**:
- [ ] Login form displays
- [ ] Credentials accepted
- [ ] Redirect to homepage
- [ ] Session persists
- [ ] No errors in console

#### Test Case: Registration

**Manual Test**:
1. Navigate to signup
2. Complete registration
3. Verify email
4. Login with new account

**Acceptance Criteria**:
- [ ] Signup form works
- [ ] Validation works
- [ ] Email sent
- [ ] Can verify email
- [ ] Can login

### 2.6 Admin Interface

#### Test Case: Admin Access

**Manual Test**:
1. Login as admin
2. Navigate to /admin/
3. Verify admin sections
4. Check preserved models

**Expected**: NO channels, posts, comments sections

**Acceptance Criteria**:
- [ ] Admin loads
- [ ] Can view users
- [ ] Can view courses
- [ ] Can view podcasts
- [ ] Can manage permissions
- [ ] NO discussion sections visible

## Phase 3: API Testing

### 3.1 REST API Tests

Create test script `test_api.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:8000/api/v0"

echo "Testing Search API..."
curl -f "$API_URL/search/?q=test" || echo "FAIL: Search"

echo "Testing Podcasts API..."
curl -f "$API_URL/podcasts/" || echo "FAIL: Podcasts list"

echo "Testing Courses API..."
curl -f "$API_URL/courses/" || echo "FAIL: Courses list"

echo "Testing Profile API..."
curl -f "$API_URL/profiles/testuser/" || echo "FAIL: Profile"

echo "Testing removed endpoints return 404..."
curl -s -o /dev/null -w "%{http_code}" "$API_URL/channels/" | grep "404" || echo "FAIL: Channels should 404"
curl -s -o /dev/null -w "%{http_code}" "$API_URL/posts/" | grep "404" || echo "FAIL: Posts should 404"
curl -s -o /dev/null -w "%{http_code}" "$API_URL/comments/" | grep "404" || echo "FAIL: Comments should 404"

echo "API tests complete"
```

Run:
```bash
chmod +x test_api.sh
./test_api.sh
```

### 3.2 GraphQL Tests (if applicable)

```graphql
# Test query for podcasts
query {
  podcasts {
    id
    title
    description
  }
}

# Test search
query {
  search(query: "python", types: [PODCAST, COURSE]) {
    results {
      title
      type
    }
  }
}
```

## Phase 4: Performance Testing

### 4.1 Page Load Times

Use browser dev tools or lighthouse:

```bash
# Install lighthouse
npm install -g lighthouse

# Test key pages
lighthouse http://localhost:8000/ --view
lighthouse http://localhost:8000/podcasts/ --view
lighthouse http://localhost:8000/search/ --view
lighthouse http://localhost:8000/courses/ --view
```

**Targets**:
- Homepage: <2s load time
- Search: <3s load time
- Podcast/Course pages: <2s load time
- Time to Interactive: <5s

### 4.2 API Response Times

```bash
# Use Apache Bench
ab -n 100 -c 10 http://localhost:8000/api/v0/search/?q=test

# Targets:
# - Mean response time: <200ms
# - 95th percentile: <500ms
# - No failed requests
```

### 4.3 Database Query Analysis

```python
# In Django shell
from django.test.utils import override_settings
from django.db import connection
from django.db import reset_queries

# Enable query logging
from django.conf import settings
settings.DEBUG = True

# Test search
from search.api import search_content
result = search_content(query="test")

# Check query count
print(f"Queries: {len(connection.queries)}")

# Should be reasonable number (<20 for search)
```

### 4.4 Load Testing

```bash
# Use locust or similar
# File: locustfile.py

from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)
    def search(self):
        self.client.get("/api/v0/search/?q=python")
    
    @task(2)
    def podcasts(self):
        self.client.get("/api/v0/podcasts/")
    
    @task(1)
    def courses(self):
        self.client.get("/api/v0/courses/")

# Run:
# locust -f locustfile.py
```

## Phase 5: Data Integrity Testing

### 5.1 Database Consistency

```sql
-- Verify no orphaned data
SELECT COUNT(*) FROM auth_user WHERE id NOT IN (SELECT DISTINCT user_id FROM ...);

-- Check foreign key integrity
-- (Should be enforced by database, but verify)

-- Verify no discussion tables remain
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%channel%' 
OR table_name LIKE '%post%' 
OR table_name LIKE '%comment%';
-- Should return 0 rows
```

### 5.2 Search Index Consistency

```bash
python manage.py shell

>>> from search.api import get_index_stats
>>> stats = get_index_stats()
>>> print(stats)
# Verify counts match database

# Verify no post/comment docs
>>> from search.api import search_content
>>> results = search_content(object_types=['post'])
>>> assert len(results) == 0
```

## Phase 6: Error Handling Testing

### 6.1 404 Pages

**Test**:
1. Navigate to old channel URL
2. Navigate to old post URL
3. Navigate to old comment URL

**Expected**: 404 page displays, no error in logs

### 6.2 Invalid Input

**Test**:
1. Search with special characters
2. Invalid API parameters
3. Malformed requests

**Expected**: Graceful error messages, no 500 errors

### 6.3 Permissions

**Test**:
1. Access admin without permissions
2. Edit other user's profile
3. Delete content without permission

**Expected**: 403 Forbidden, not 500 error

## Phase 7: Browser Compatibility Testing

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**Check**:
- Page layouts
- Search functionality
- Audio playback
- Forms
- Navigation

## Phase 8: Accessibility Testing

```bash
# Use axe-core or pa11y
npm install -g pa11y

pa11y http://localhost:8000/
pa11y http://localhost:8000/search/
pa11y http://localhost:8000/podcasts/
```

**Verify**:
- [ ] No critical accessibility issues
- [ ] ARIA labels correct
- [ ] Keyboard navigation works
- [ ] Screen reader compatible

## Phase 9: Security Testing

### 9.1 OWASP Top 10

Check for:
- [ ] SQL injection (should be prevented by Django ORM)
- [ ] XSS (should be prevented by Django templates)
- [ ] CSRF (should be prevented by Django middleware)
- [ ] Authentication bypass
- [ ] Sensitive data exposure

### 9.2 Dependency Vulnerabilities

```bash
# Python dependencies
pip-audit

# JavaScript dependencies
npm audit

# Fix high/critical vulnerabilities
npm audit fix
```

## Phase 10: Staging Environment Testing

Deploy to staging and run full test suite:

### 10.1 Smoke Test

```bash
#!/bin/bash
STAGING_URL="https://staging.example.com"

curl -f "$STAGING_URL/" || echo "FAIL: Homepage"
curl -f "$STAGING_URL/search/" || echo "FAIL: Search page"
curl -f "$STAGING_URL/podcasts/" || echo "FAIL: Podcasts"
curl -f "$STAGING_URL/api/v0/search/?q=test" || echo "FAIL: Search API"
```

### 10.2 Full Regression Test

Run entire test suite against staging:
- All API tests
- All UI tests  
- Performance tests
- Load tests

### 10.3 User Acceptance Testing (UAT)

Invite stakeholders to test:
- Search functionality
- Podcast browsing
- Course browsing
- User profiles

Collect feedback and address issues.

## Test Results Documentation

Create test report: `test-results-YYYY-MM-DD.md`

```markdown
# Test Results - [Date]

## Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Skipped: W

## Functional Tests
- Search: ✓ PASS
- Podcasts: ✓ PASS
- Courses: ✓ PASS
- Profiles: ✓ PASS

## Performance Tests
- Page Load: ✓ PASS (avg 1.2s)
- API Response: ✓ PASS (avg 180ms)
- Database Queries: ✓ PASS (avg 8 queries)

## Issues Found
1. [Issue description]
   - Severity: High/Medium/Low
   - Status: Fixed/Open
   - Resolution: [How fixed]

## Sign-off
Tested by: [Name]
Date: [Date]
Status: PASS/FAIL
```

## Pre-Production Checklist

Before deploying to production:

- [ ] All tests pass in dev
- [ ] All tests pass in staging
- [ ] Performance acceptable
- [ ] No critical bugs
- [ ] UAT completed
- [ ] Security review done
- [ ] Load testing done
- [ ] Rollback plan tested
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Documentation complete
- [ ] Team trained
- [ ] Stakeholders notified

## Next Steps

Proceed to [07-rollback-plan.md](./07-rollback-plan.md) for rollback procedures.
