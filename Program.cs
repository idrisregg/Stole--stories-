using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using Stole.Api.Caching;
using Stole.Api.Data;
using Stole.Api.Graph;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddOpenApi();

builder.Services.AddPooledDbContextFactory<StoleDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
    ConnectionMultiplexer.Connect(builder.Configuration.GetConnectionString("Redis")!));

builder.Services.AddGraphQLServer()
    .AddQueryType<Query>()
    .AddMutationType<Mutation>()
    .RegisterDbContextFactory<StoleDbContext>()
    .AddInMemorySubscriptions();

builder.Services.AddSingleton<RedisStoryService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// Serve the frontend from wwwroot: index.html is the default document for "/".
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGraphQL();

// Unknown paths (deep links) fall back to the frontend shell instead of 404.
// /graphql and /openapi are explicit endpoints, so they are not affected.
app.MapFallbackToFile("index.html");

app.Run();
