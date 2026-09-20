using Stole.Api.Data;

namespace Stole.Api.Models;

public record CreateUserInput(string Username, string? AvatarUrl);
public record CreateStoryInput(Guid UserId, string MediaUrl, MediaType MediaType, string? Caption);
public record RecordViewInput(Guid StoryId, Guid ViewerId);