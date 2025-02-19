def calculate_total_duration(parsed_script):
    events = parsed_script.get("events", [])
    print(len(events), "events in total dur")
    print(events[0])
    total_duration = sum(event.get("duration", 0) for event in events)
    return total_duration * 1000  # Convert to milliseconds
