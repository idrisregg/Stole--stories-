using Microsoft.EntityFrameworkCore;
using Stole.Api.Caching;
using Stole.Api.Data;
using Stole.Api.Models;

namespace Stole.Api.Graph;

public class Mutation
{
    public async Task<User> CreateUserAsync(CreateUserInput input, StoleDbContext db)
    {
        var user = new User
        {
            Username = input.Username,
            AvatarUrl = string.IsNullOrWhiteSpace(input.AvatarUrl) ? string.Empty : input.AvatarUrl,
            CreatedAt = DateTime.UtcNow
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return user;
    }

    public async Task<Story> CreateStoryAsync(CreateStoryInput input, StoleDbContext db, RedisStoryService redis)
    {
        var story = new Story
        {
            UserId = input.UserId,
            MediaUrl = input.MediaUrl,
            MediaType = input.MediaType,
            Caption = input.Caption,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        };

        db.Stories.Add(story);
        await db.SaveChangesAsync();

        await redis.PublishStory(story);

        return story;
    }

    public async Task<bool> RecordViewAsync(
        RecordViewInput input,
        StoleDbContext db,
        RedisStoryService redis)
    {
        var existing = await db.StoryViews
            .AnyAsync(v => v.StoryId == input.StoryId && v.ViewerId == input.ViewerId);

        // 2. Save view audit row to SQL if first time watching
        if (!existing)
        {
            db.StoryViews.Add(new StoryView
            {
                StoryId = input.StoryId,
                ViewerId = input.ViewerId,
                ViewedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        await redis.RecordViewAsync(input.StoryId, input.ViewerId);

        long newCount = await redis.GetViewCountAsync(input.StoryId);

        return true;
    }
}

