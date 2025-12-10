import json

def clean_config():
    try:
        with open('appwrite.config.json', 'r') as f:
            config = json.load(f)
        
        modified = False
        
        if 'tables' in config:
            for table in config['tables']:
                if 'columns' in table:
                    for col in table['columns']:
                        if col.get('required') is True and 'default' in col:
                            del col['default']
                            modified = True
                            print(f"Removed default from required column {col['key']} in table {table['name']}")
                            
        if modified:
            with open('appwrite.config.json', 'w') as f:
                json.dump(config, f, indent=4)
            print("Successfully updated appwrite.config.json")
        else:
            print("No changes needed")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    clean_config()
