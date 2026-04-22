export const default_code = `flowchart TD
    Start[Start] --> Auth{"User Authenticated?"}
    Auth -->|Yes| Dash[Load Dashboard]
    Auth -->|No| Login["Show Login Screen"]

    subgraph "Authentication Process"
        Login --> Creds{"Valid Credentials?"}
        Creds -->|Yes| Redirect[Redirect to Dashboard]
        Creds -->|No| Err[Show Error Message]
        Err -->|Retry| Login
    end

    Dash --> Notifs{"Has Notifications?"}
    Notifs -->|Yes| Panel[Show Notifications Panel]
    Notifs -->|No| Skip[Skip]

    subgraph "User Actions"
        Panel --> Msg[View Messages]
        Msg --> Resp{"Respond?"}
        Resp -->|Yes| Reply[Open Reply Window]
        Resp -->|No| Close[Close Panel]
    end

    Skip --> Perms{"Check Permissions"}
    Perms -->|Admin| AdminP[Show Admin Panel]
    Perms -->|User| UserD[Show User Dashboard]

    AdminP --> Manage[Manage Users]
    AdminP --> Reports[View Reports]
    UserD --> Profile[Edit Profile]
    UserD --> Purchases[View Purchases]

    Manage & Reports & Profile & Purchases --> Logout[Logout]
    Logout --> End[End]
`;
