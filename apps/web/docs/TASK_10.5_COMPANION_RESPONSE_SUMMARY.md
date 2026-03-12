# Task 10.5: Companion Response (Respond) - Implementation Summary

## Overview

Implemented the Companion response execution functionality, which is the final step in the Companion governance lifecycle (Summon → Request → Approve → Respond). This task enables the actual AI API call and response generation after context has been selected.

## Requirements Validated

- **14.5**: WHEN Companion_Owner 批准后，THE Companion SHALL 执行实际 API 调用并将响应（Respond）内容输出到 Room Timeline，此时消耗 token

## Implementation Details

### API Route: `/api/companion/execute-response`

**Location**: `apps/web/app/api/companion/execute-response/route.ts`

**Method**: POST

**Request Body**:
```typescript
{
  invocationId: string  // UUID of the ai_invocation record
}
```

**Response**:
```typescript
{
  success: true,
  invocation: {
    id: string,
    companionId: string,
    companionName: string,
    roomId: string,
    status: 'completed',
    messageId: string,
    tokensUsed: number,
    completedAt: string
  }
}
```

### Workflow

1. **Authentication & Authorization**
   - Verifies user is authenticated
   - Verifies user is the Companion owner
   - Verifies invocation is in 'processing' state
   - Verifies context has been set (context_segment_id exists)

2. **Fetch Companion Configuration**
   - Retrieves companion details from ai_companions table:
     - `model`: AI model to use (e.g., 'gpt-4', 'gemini-pro')
     - `system_prompt`: System instructions for the AI
     - `temperature`: Creativity parameter (0.0-1.0)
     - `max_tokens`: Maximum response length
     - `provider_connection_id`: Link to OAuth connection

3. **Fetch Context Content**
   - Retrieves messages from the selected Segment (context_segment_id)
   - Orders messages by message_order
   - Builds context string in format: "DisplayName: content"
   - Includes user display names from profiles table

4. **Call AI Provider API**
   - Uses Provider Binding's HTTP client for automatic token injection
   - Supports two providers:
     - **OpenAI**: Calls `/v1/chat/completions` endpoint
       - Includes system prompt as system message
       - Includes context as user message
       - Uses temperature and max_tokens settings
     - **Google Gemini**: Calls `/v1beta/models/{model}:generateContent` endpoint
       - Combines system prompt and context in single prompt
       - Uses generationConfig for temperature and maxOutputTokens

5. **Create Message Record**
   - Inserts response into messages table
   - Sets user_id to companion owner (message appears from owner)
   - Sets message_type to 'text'
   - Supabase Realtime automatically pushes to Room members

6. **Update Invocation Status**
   - Updates ai_invocation record:
     - `status`: 'completed'
     - `response_message_id`: ID of created message
     - `tokens_used`: Token count from API response
     - `completed_at`: Current timestamp

7. **Error Handling**
   - On API failure:
     - Updates invocation status to 'failed'
     - Records error_message
     - Sets completed_at timestamp
   - Returns appropriate error codes:
     - `AUTH_UNAUTHORIZED`: Not authenticated
     - `COMPANION_NOT_FOUND`: Invocation not found
     - `COMPANION_INVALID_STATE`: Not in processing state
     - `COMPANION_NOT_OWNER`: User is not owner
     - `COMPANION_CONTEXT_REQUIRED`: Context not set
     - `COMPANION_PROVIDER_INVALID`: Provider connection invalid
     - `COMPANION_API_FAILED`: AI API call failed

## Provider Integration

### OpenAI Integration

```typescript
const messages = [];

// Add system prompt if configured
if (companionData.system_prompt) {
  messages.push({
    role: 'system',
    content: companionData.system_prompt,
  });
}

// Add context as user message
messages.push({
  role: 'user',
  content: contextString,
});

const response = await httpClient.post(
  'https://api.openai.com/v1/chat/completions',
  {
    model: companionData.model,
    messages,
    temperature: companionData.temperature,
    max_tokens: companionData.max_tokens,
  }
);

responseText = response.data.choices[0]?.message?.content || '';
tokensUsed = response.data.usage?.total_tokens || 0;
```

### Google Gemini Integration

```typescript
// Build prompt with system prompt and context
let prompt = '';
if (companionData.system_prompt) {
  prompt += `${companionData.system_prompt}\n\n`;
}
prompt += contextString;

const response = await httpClient.post(
  `https://generativelanguage.googleapis.com/v1beta/models/${companionData.model}:generateContent`,
  {
    contents: [{
      parts: [{ text: prompt }],
    }],
    generationConfig: {
      temperature: companionData.temperature,
      maxOutputTokens: companionData.max_tokens,
    },
  }
);

responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
tokensUsed = response.data.usageMetadata?.totalTokenCount || 0;
```

## Key Features

### 1. Automatic Token Management
- Uses Provider Binding's HTTP client (`getClient`)
- Automatically injects Authorization Bearer token
- Automatically refreshes expired tokens
- Business logic doesn't handle tokens directly

### 2. Context Control
- Only uses explicitly selected context (context_segment_id)
- Never accesses full Room Timeline automatically
- Validates context Segment belongs to same Room

### 3. Token Usage Tracking
- Records token consumption from API response
- Stores in ai_invocations.tokens_used field
- Enables usage analytics and billing

### 4. Error Recovery
- Gracefully handles API failures
- Updates invocation status to 'failed'
- Records detailed error messages
- Notifies owner and requester

### 5. Visibility Control
- Respects invocation.visibility setting
- 'public': Message visible to all Room members
- 'private': Message only visible to owner (future enhancement)

## Database Changes

### ai_invocations Table Updates

When execution completes successfully:
```sql
UPDATE ai_invocations SET
  status = 'completed',
  response_message_id = '<message_id>',
  tokens_used = <token_count>,
  completed_at = NOW()
WHERE id = '<invocation_id>';
```

When execution fails:
```sql
UPDATE ai_invocations SET
  status = 'failed',
  error_message = '<error_details>',
  completed_at = NOW()
WHERE id = '<invocation_id>';
```

### messages Table Insert

```sql
INSERT INTO messages (
  room_id,
  user_id,
  content,
  message_type,
  is_deleted
) VALUES (
  '<room_id>',
  '<owner_id>',
  '<ai_response>',
  'text',
  false
);
```

## Testing

### Test File: `tests/companion-execute-response.test.ts`

**Test Coverage**:
1. Authentication validation
2. Required field validation (invocationId)
3. State validation (must be 'processing')
4. Authorization validation (must be owner)
5. Context validation (must be set)
6. OpenAI API integration
7. Google Gemini API integration
8. Error handling (API failures)
9. Provider connection validation
10. System prompt inclusion
11. Temperature and max_tokens usage
12. Context building from Segment
13. Token usage recording
14. Message creation with owner as sender
15. Invocation update with response_message_id
16. Timestamp recording (completed_at)

## Integration with Existing Components

### 1. Provider Binding Integration
- Uses `getClient(connectionId)` for HTTP client
- Automatic token refresh via `getValidAccessToken`
- Supports OpenAI and Google providers

### 2. Supabase Integration
- Queries ai_invocations with companion details
- Queries segment_messages for context
- Queries provider_connections for OAuth tokens
- Inserts messages with Realtime push
- Updates invocations with completion status

### 3. Companion Workflow Integration
- Follows after context selection (task 10.4)
- Completes the governance lifecycle
- Enables subsequent invocations

## Security Considerations

1. **Authorization**: Only companion owner can execute
2. **State Validation**: Only processing invocations can execute
3. **Context Isolation**: Only selected context is sent to AI
4. **Token Security**: Tokens handled by Provider Binding layer
5. **Error Privacy**: Error messages don't leak sensitive data

## Performance Considerations

1. **Async API Calls**: Non-blocking AI API requests
2. **Token Caching**: Provider Binding caches valid tokens
3. **Batch Context**: Single query for all context messages
4. **Realtime Push**: Automatic message distribution

## Future Enhancements

1. **Streaming Responses**: Support for streaming AI responses
2. **Multi-turn Conversations**: Context includes previous exchanges
3. **Response Formatting**: Markdown rendering, code highlighting
4. **Usage Analytics**: Dashboard for token consumption
5. **Rate Limiting**: Prevent excessive API usage
6. **Response Caching**: Cache similar requests
7. **Private Visibility**: Implement private message visibility

## Error Scenarios

| Scenario | Status Code | Error Code | Action |
|----------|-------------|------------|--------|
| Not authenticated | 401 | AUTH_UNAUTHORIZED | Redirect to login |
| Missing invocationId | 400 | VALIDATION_REQUIRED_FIELD | Show validation error |
| Invocation not found | 404 | COMPANION_NOT_FOUND | Show not found message |
| Wrong state | 400 | COMPANION_INVALID_STATE | Show state error |
| Not owner | 403 | COMPANION_NOT_OWNER | Show permission error |
| No context | 400 | COMPANION_CONTEXT_REQUIRED | Prompt for context |
| Invalid provider | 400 | COMPANION_PROVIDER_INVALID | Show provider error |
| API failure | 500 | COMPANION_API_FAILED | Show API error, log details |

## Logging

All operations are logged with structured data:
- `invocationId`: Invocation UUID
- `companionId`: Companion UUID
- `provider`: AI provider name
- `model`: AI model name
- `tokensUsed`: Token consumption
- `messageCount`: Context message count
- `error`: Error details (if any)

## Files Created/Modified

### Created
- `apps/web/app/api/companion/execute-response/route.ts` - API route implementation
- `apps/web/tests/companion-execute-response.test.ts` - Test suite
- `apps/web/docs/TASK_10.5_COMPANION_RESPONSE_SUMMARY.md` - This document

### Modified
- `.kiro/specs/sprint1-pocket-room/tasks.md` - Marked task as completed

## Next Steps

The next tasks in the Companion workflow are:
- **10.6**: Implement Companion response visibility control (public/private)
- **10.7**: Implement Companion approval exemptions (owner and whitelist)
- **10.8**: Implement Companion API call error handling enhancements
- **10.9**: Write property-based tests for Companion governance
- **10.10**: Checkpoint - ensure all tests pass

## Conclusion

Task 10.5 successfully implements the Companion response execution, completing the core Companion governance lifecycle. The implementation:
- ✅ Retrieves Companion configuration (model, system_prompt, temperature, max_tokens)
- ✅ Fetches context content from selected Segment
- ✅ Calls AI API through Provider Binding (automatic token injection)
- ✅ Creates message record with response
- ✅ Updates invocation status to 'completed'
- ✅ Records token usage
- ✅ Handles errors gracefully
- ✅ Supports OpenAI and Google Gemini providers
- ✅ Validates requirement 14.5

The Companion can now generate AI responses in Rooms with full governance control!
