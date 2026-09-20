using System.Text.Json;
using StackExchange.Redis;
using Stole.Api.Data;

namespace Stole.Api.Caching;

public class RedisStoryService(IConnectionMultiplexer redis)
{
    private readonly IConnectionMultiplexer _redis = redis;
    private readonly IDatabase db = redis.GetDatabase();
    public async Task PublishStory(Story story)
    {
        var storyKey = $"story:{story.Id}";
        var userTrayKey = $"stol:user:{story.UserId}:active_stories";

        var serializeStory = JsonSerializer.Serialize(new
        {
            story.Id,
            story.UserId,
            story.MediaUrl,
            MediaType = story.MediaType.ToString(),
            story.Caption,
            story.CreatedAt,
            story.ExpiresAt
        });

        TimeSpan ttl = story.ExpiresAt - DateTime.UtcNow;

        if (ttl > TimeSpan.Zero)
        {
            await db.StringSetAsync(storyKey, serializeStory, ttl);

            double score = new DateTimeOffset(story.ExpiresAt).ToUnixTimeSeconds();

            await db.SortedSetAddAsync(userTrayKey, story.Id.ToString(), score);

            await db.KeyExpireAsync(userTrayKey, TimeSpan.FromHours(24));
        }
    }

    public async Task RecordViewAsync(Guid storyId, Guid viewerId)
    {
        var viewerKey = $"stol:story:{storyId}:viewers";
        await db.SetAddAsync(viewerKey, viewerId.ToString());
    }

    public async Task<long> GetViewCountAsync(Guid storyId){
        
        var viwerKey = $"stol:story:{storyId}:viewers";
        return await db.SetLengthAsync(viwerKey);
    }
}