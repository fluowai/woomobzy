$url = "https://agklraytctednncsncbd.supabase.co/auth/v1/token?grant_type=password"
$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2xyYXl0Y3RlZG5uY3NuY2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3ODIxNzUsImV4cCI6MjEwMjM1ODE3NX0.kOfq-2MQUgdgK53yW1LhrntQ7v0JCMbUPBjqdc9DbF0"
    "Content-Type" = "application/json"
}
$body = '{"email":"test@test.com","password":"test123"}'
$response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
$response | ConvertTo-Json -Depth 10