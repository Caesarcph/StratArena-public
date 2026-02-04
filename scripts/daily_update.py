#!/usr/bin/env python3
"""
Daily automation script for StratArena-public project.

This script performs the following tasks:
1. Runs publish_site.py to update the website
2. Commits and pushes changes to StratArena-public repository
3. Reports results back to the main agent
"""

import os
import sys
import subprocess
import datetime
import json
import logging
from pathlib import Path

def setup_logging():
    """Set up logging for the daily update process."""
    log_dir = Path(__file__).parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)
    
    log_file = log_dir / f"daily_update_{datetime.date.today().strftime('%Y%m%d')}.log"
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger(__name__)

def run_command(cmd, cwd=None, capture_output=True, timeout=300):
    """Run a shell command and return the result."""
    logger = logging.getLogger(__name__)
    logger.info(f"Running command: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=capture_output,
            text=True,
            timeout=timeout,
            check=False  # We'll handle return codes ourselves
        )
        
        if result.returncode != 0:
            logger.error(f"Command failed with return code {result.returncode}")
            logger.error(f"stdout: {result.stdout}")
            logger.error(f"stderr: {result.stderr}")
        
        return result
    
    except subprocess.TimeoutExpired:
        logger.error(f"Command timed out after {timeout} seconds: {cmd}")
        return subprocess.CompletedProcess(cmd, -1, "", "Command timed out")

def check_git_status(repo_path):
    """Check if there are any uncommitted changes in the repository."""
    logger = logging.getLogger(__name__)
    result = run_command(["git", "status", "--porcelain"], cwd=repo_path)
    
    if result.returncode != 0:
        logger.error("Failed to check git status")
        return False, ""
    
    uncommitted_changes = result.stdout.strip()
    return len(uncommitted_changes) > 0, uncommitted_changes

def commit_and_push(repo_path, commit_message):
    """Commit and push changes to the repository."""
    logger = logging.getLogger(__name__)
    
    # Add all changes
    result = run_command(["git", "add", "."], cwd=repo_path)
    if result.returncode != 0:
        logger.error("Failed to add changes to git")
        return False
    
    # Check if there are actually changes to commit
    has_changes, _ = check_git_status(repo_path)
    if not has_changes:
        logger.info("No changes to commit")
        return True
    
    # Commit changes
    result = run_command(["git", "commit", "-m", commit_message], cwd=repo_path)
    if result.returncode != 0:
        logger.error("Failed to commit changes")
        return False
    
    # Push changes
    result = run_command(["git", "push", "origin", "main"], cwd=repo_path)
    if result.returncode != 0:
        logger.error("Failed to push changes")
        return False
    
    logger.info("Successfully committed and pushed changes")
    return True

def main():
    """Main function to run the daily update process for public repo."""
    logger = setup_logging()
    logger.info("Starting daily update process for public repository")
    
    try:
        # Change to the StratArena-public directory
        repo_path = Path("/home/caesar/StratArena-public")
        if not repo_path.exists():
            logger.error(f"Repository path does not exist: {repo_path}")
            return 1
        
        os.chdir(repo_path)
        
        # Initialize git repo if needed
        result = run_command(["git", "init"], cwd=repo_path)
        if result.returncode != 0:
            logger.error("Failed to initialize git repository")
            return 1
        
        # Set git user config if not set
        run_command(["git", "config", "user.email", "bot@example.com"], cwd=repo_path)
        run_command(["git", "config", "user.name", "OpenClaw Automation"], cwd=repo_path)
        
        # Pull latest changes to avoid conflicts
        result = run_command(["git", "pull", "origin", "main"], cwd=repo_path)
        if result.returncode != 0:
            logger.warning("Could not pull latest changes, continuing anyway")
        
        # Run publish_site.py
        logger.info("Running publish_site.py...")
        result = run_command(["python3", "scripts/publish_site.py"], cwd=repo_path)
        if result.returncode != 0:
            logger.error("Failed to run publish_site.py")
            return 1
        
        # Commit and push to StratArena-public
        commit_msg = f"Site update: {datetime.date.today().strftime('%Y-%m-%d')} [automated]"
        if not commit_and_push(repo_path, commit_msg):
            logger.error("Failed to commit and push to StratArena-public")
            return 1
        
        logger.info("Daily update process for public repository completed successfully!")
        return 0
        
    except Exception as e:
        logger.error(f"Unexpected error during daily update: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())