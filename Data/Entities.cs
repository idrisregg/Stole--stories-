
using System.ComponentModel.DataAnnotations.Schema;

namespace Stole.Api.Data;

public class User
{
    public Guid Id { get; set; } = new Guid { };

    public string Username { get; set; } = string.Empty;

    public string AvatarUrl { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Story> Stories { get; set; } = new List<Story>();

    public ICollection<StoryView> StoryViews { get; set; } = new List<StoryView>();
}


public enum MediaType
{
    Video,
    Image
}
public class Story
{
    public Guid Id { get; set; } = new Guid { };

    public Guid UserId { get; set; }

    public User User { get; set; } = null!;

    public string MediaUrl { get; set; } = string.Empty;

    public MediaType MediaType { get; set; }

    public string? Caption { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddHours(24);

    public ICollection<StoryView> Views { get; set; } = new List<StoryView>();
}

public class StoryView
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoryId { get; set; }
    public Story Story { get; set; } = null!;

    public Guid ViewerId { get; set; }
    public User Viewer { get; set; } = null!;

    public DateTime ViewedAt { get; set; } = DateTime.UtcNow;
}