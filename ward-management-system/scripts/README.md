# Database Optimization Scripts

This directory contains scripts to optimize database performance for the Ward Management System.

## optimize-database.js

This script creates database indexes to improve query performance, particularly for the wards collection which can cause timeouts in production.

### Usage

```bash
# Make sure you're in the project root directory
cd ward-management/ward-management-system

# Run the optimization script
node scripts/optimize-database.js
```

### What it does

1. **Creates compound indexes** for the most common query patterns
2. **Optimizes the Wards collection** - the main source of timeout issues
3. **Optimizes Clusters and Users collections** for better overall performance
4. **Shows collection statistics** to help monitor database health

### Indexes Created

#### Wards Collection
- `{ district: 1, panchayath: 1, isActive: 1 }` - For filtering by location
- `{ wardAdmin: 1, isActive: 1 }` - For ward admin queries
- `{ coordinator: 1, isActive: 1 }` - For coordinator queries
- `{ district: 1, name: 1, isActive: 1 }` - For sorting and general queries
- `{ name: 1, district: 1, isActive: 1 }` - For unique constraints
- `{ wardNumber: 1, panchayath: 1, district: 1, isActive: 1 }` - For ward number uniqueness

#### Clusters Collection
- `{ ward: 1, isActive: 1 }` - For filtering by ward
- `{ name: 1, isActive: 1 }` - For searching by name
- `{ clusterNumber: 1, isActive: 1 }` - For searching by number
- `{ 'coordinator.name': 1, isActive: 1 }` - For coordinator queries

#### Users Collection
- `{ email: 1 }` - For authentication
- `{ mobileNumber: 1 }` - For mobile-based auth
- `{ role: 1, isActive: 1 }` - For role-based queries
- `{ district: 1, role: 1 }` - For district-based queries

### When to Run

- **After initial deployment** to production
- **When experiencing slow queries** or timeouts
- **After significant data growth**
- **During maintenance windows**

### Monitoring

After running the optimization:

1. Monitor the application logs for improved response times
2. Check that the 504 timeout errors are resolved
3. Use the collection statistics to track database growth
4. Consider running this script periodically as data grows

### Troubleshooting

If you encounter issues:

1. **Permission errors**: Ensure your MongoDB user has index creation permissions
2. **Connection errors**: Verify your `MONGODB_URI` environment variable
3. **Index conflicts**: The script handles existing indexes gracefully
4. **Memory issues**: Run during low-traffic periods for large collections

### Performance Tips

1. **Use pagination** in your API endpoints (limit query results)
2. **Implement caching** for frequently accessed data
3. **Use projection** to limit returned fields
4. **Monitor slow queries** in production
5. **Consider read replicas** for read-heavy workloads