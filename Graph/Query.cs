using HotChocolate.Subscriptions;
using Microsoft.EntityFrameworkCore;
using Stole.Api.Data;

namespace Stole.Api.Graph;

public class Query
{

    public IQueryable<User> GetUsers(StoleDbContext db) => db.Users;

    public async Task<List<Story>> GetActiveStories(StoleDbContext db)
    {
        var now = DateTime.UtcNow;

        return await db.Stories
        .Include(s => s.User)
        .Include(s => s.Views)
        .Where(s => s.ExpiresAt > now)
        .OrderByDescending(s => s.CreatedAt)
        .ToListAsync();
    }
}