using Microsoft.EntityFrameworkCore;

namespace Stole.Api.Data;

public class StoleDbContext : DbContext
{
    public StoleDbContext(DbContextOptions<StoleDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Story> Stories => Set<Story>();
    public DbSet<StoryView> StoryViews => Set<StoryView>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<StoryView>()
            .HasIndex(v => new { v.StoryId, v.ViewerId })
            .IsUnique();

        modelBuilder.Entity<Story>()
            .HasIndex(s => new { s.UserId, s.ExpiresAt });
    }
}