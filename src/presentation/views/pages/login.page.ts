export function renderLoginPage(errorMessage?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <meta name="theme-color" content="#0d0d0d">
    <title>Login | PM2 EID Is Discord Dashboard</title>
    <link rel="icon" type="image/webp" href="/static/icon.webp">
    <link rel="stylesheet" href="/static/css/main.css">
</head>
<body class="login-body">
    <div class="login-wrapper">
        <div class="login-card">
            <div class="login-brand">
                <img src="/static/icon.webp" alt="PM2 EID Logo" class="login-logo-img">
                <h1 class="logo">PM2 <span class="accent">EID</span></h1>
                <p class="login-subtitle">PM2 EID Is Discord Dashboard</p>
            </div>

            ${errorMessage ? `<div class="alert alert-error login-alert">${escapeHtml(errorMessage)}</div>` : ''}

            <form method="POST" action="/login" class="login-form">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" class="form-input" required autofocus autocomplete="username" placeholder="admin">
                </div>

                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" class="form-input" required autocomplete="current-password" placeholder="••••••••">
                </div>

                <button type="submit" class="btn btn-primary btn-block">
                    Sign In
                </button>
            </form>

            <div class="login-footer">
                <span>Developed by <a href="https://sxnnysideproject.com" target="_blank" rel="noopener noreferrer" class="footer-link">Core Red Project</a></span>
            </div>
        </div>
    </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
