use clap::{Parser, Subcommand};
use std::env;

use claudy_lib::config;

#[derive(Parser)]
#[command(name = "claudy")]
#[command(about = "Claudy - Your Claude Code companion")]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Register current directory for watching
    Register,
    /// Unregister current directory
    Unregister,
    /// List registered projects
    List,
    /// Show Claudy status
    Status,
    /// Show config file location
    Config,
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Some(Commands::Register) => register_project(),
        Some(Commands::Unregister) => unregister_project(),
        Some(Commands::List) => list_projects(),
        Some(Commands::Status) => show_status(),
        Some(Commands::Config) => show_config(),
        None => start_daemon(),
    }
}

fn register_project() {
    let current_dir = env::current_dir().expect("Could not get current directory");
    let path = current_dir.to_string_lossy().to_string();

    let mut cfg = config::load_config();

    if cfg.projects.registered.contains(&path) {
        println!("Project already registered: {}", path);
        return;
    }

    cfg.projects.registered.push(path.clone());
    config::save_config(&cfg).expect("Failed to save config");
    println!("Registered: {}", path);
}

fn unregister_project() {
    let current_dir = env::current_dir().expect("Could not get current directory");
    let path = current_dir.to_string_lossy().to_string();

    let mut cfg = config::load_config();

    if let Some(pos) = cfg.projects.registered.iter().position(|p| p == &path) {
        cfg.projects.registered.remove(pos);
        config::save_config(&cfg).expect("Failed to save config");
        println!("Unregistered: {}", path);
    } else {
        println!("Project not registered: {}", path);
    }
}

fn list_projects() {
    let cfg = config::load_config();

    if cfg.projects.registered.is_empty() {
        println!("No projects registered.");
        println!("Use 'claudy-cli register' in a project directory to add one.");
        return;
    }

    println!("Registered projects:");
    for project in &cfg.projects.registered {
        println!("  - {}", project);
    }
}

fn show_status() {
    println!("Claudy status: Not yet implemented");
    // TODO: Check if daemon is running, show active sessions
}

fn show_config() {
    let path = config::config_path();
    println!("Config file: {}", path.display());
}

fn start_daemon() {
    println!("Starting Claudy daemon...");
    println!("(Use 'cargo tauri dev' to run the full app)");
    // TODO: Start the Tauri app or connect to running instance
}
