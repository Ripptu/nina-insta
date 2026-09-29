mod keychain;
mod setup;
mod state;
mod tools;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tools::log("App gestartet");
    tauri::Builder::default()
        .manage(setup::ClaudeSession::default())
        .invoke_handler(tauri::generate_handler![
            setup::get_state,
            setup::open_url,
            setup::github_login,
            setup::github_repos,
            setup::claude_setup,
            setup::claude_send,
            setup::claude_manual,
            setup::drive_connect,
            setup::drive_folders,
            setup::drive_setup,
            setup::instagram_save,
            setup::gmail_save,
            setup::final_check,
        ])
        .run(tauri::generate_context!())
        .expect("Nina Insta konnte nicht starten");
}
