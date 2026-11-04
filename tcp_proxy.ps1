# TCP Proxy PowerShell - IPv4 localhost:15432 -> IPv6 Supabase
$IPv6Target = "db.agklraytctednncsncbd.supabase.co"
$IPv6Port = 5432
$ListenPort = 15432

Write-Host ("Iniciando proxy TCP 0.0.0.0:{0} -> {1}:{2} (IPv6)" -f $ListenPort, $IPv6Target, $IPv6Port)

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $ListenPort)
$listener.Start()

while ($true) {
    $client = $listener.AcceptTcpClient()
    Write-Host ("Conexão de {0}" -f $client.Client.RemoteEndPoint)
    
    $thread = {
        param($client)
        try {
            $server = New-Object System.Net.Sockets.TcpClient
            $server.Connect($IPv6Target, $IPv6Port)
            
            $clientStream = $client.GetStream()
            $serverStream = $server.GetStream()
            
            $buffer1 = New-Object byte[] 8192
            $buffer2 = New-Object byte[] 8192
            
            $job1 = Start-Job -ScriptBlock {
                param($src, $dst, $buf)
                try {
                    while (($read = $src.Read($buf, 0, $buf.Length)) -gt 0) {
                        $dst.Write($buf, 0, $read)
                        $dst.Flush()
                    }
                } catch {}
            } -ArgumentList $clientStream, $serverStream, $buffer1
            
            $job2 = Start-Job -ScriptBlock {
                param($src, $dst, $buf)
                try {
                    while (($read = $src.Read($buf, 0, $buf.Length)) -gt 0) {
                        $dst.Write($buf, 0, $read)
                        $dst.Flush()
                    }
                } catch {}
            } -ArgumentList $serverStream, $clientStream, $buffer2
            
            Wait-Job $job1, $job2 | Remove-Job
        } catch {
            Write-Host "Erro: $_"
        } finally {
            $client.Close()
            $server.Close()
        }
    }
    
    Start-ThreadJob -ScriptBlock $thread -ArgumentList $client | Out-Null
}