# Query Syntax

CCRP uses a URL-based query syntax that balances simplicity with
expressiveness. This section describes how to construct queries for different
types of dimensions and data patterns.

## Dimension Types

CCRP queries work with two types of dimensions:

### Continuous Dimensions

Dimensions that represent continuous values like coordinates, time, or
measurements:

- Time: `2024-01-01`, `2024-01-01T12:00:00Z`
- Spatial coordinates: `lat=30.5`, `lon=-120.0`
- Measurements: `depth=100`, `pressure=1013.25`

### Discrete Dimensions

Dimensions that represent categorical or discrete values:

- Variables: `variable=temperature`, `band=C07`
- Categories: `quality=good`, `sensor=A`
- Identifiers: `station_id=KBOS`, `model_run=12Z`

## Query Operators

### Equality (Default)

Matches exact values. This is the default when no operator is specified.

#### Syntax

`dimension=value`

#### Examples

```
band=C07
time=2024-01-15
station_id=KBOS
```

### Set Inclusion (OR)

Matches any value in a comma-separated list. This is the OR operator.

#### Syntax

`dimension=value1,value2,value3`

#### Examples

```
band=C07,C08,C09           # Any of these three bands
quality=good,fair          # Either good OR fair quality
year=2020,2021,2022        # Any of these three years
```

### Comparison Operators

For continuous dimensions, use comparison operators to create ranges and boundaries.

#### Syntax

- `dimension[gt]=value` - Greater than
- `dimension[gte]=value` - Greater than or equal
- `dimension[lt]=value` - Less than
- `dimension[lte]=value` - Less than or equal

#### Examples

```
temperature[gte]=20.0      # Temperature >= 20.0
time[lt]=2024-01-01        # Times before 2024
depth[gt]=100              # Depths greater than 100
pressure[lte]=1013.25      # Pressure <= 1013.25
```

### Open-Ended Ranges

You can create open-ended ranges by using only one boundary:

```
time[gte]=2024-01-01       # Everything from 2024 forward
depth[lt]=100              # Everything less than 100m
temperature[gt]=30         # Everything above 30 degrees
```

### Creating Ranges

To select a range, combine operators:

```
time[gte]=2024-01-01&time[lt]=2024-02-01    # All of January 2024
lat[gte]=30&lat[lt]=40                      # Latitude from 30 to 40 (exclusive)
depth[gte]=0&depth[lte]=100                 # Depth from 0 to 100 (inclusive)
```

## Combining Queries

Multiple dimension queries are combined with AND logic using `&`:

```
time[gte]=2024-01-01&time[lt]=2024-02-01&lat[gte]=30&lat[lt]=40&band=C07
```

This means: January 2024 AND latitude 30-40 AND band C07.

Multiple conditions on the same dimension are also combined with AND:

```
temperature[gte]=20&temperature[lte]=30    # Temperature between 20 and 30
```

## Query Mechanics

### Chunk Boundary Expansion

When you query a range, CCRP returns all chunks that overlap with your
requested range:

- Request: `lat[gte]=35&lat[lt]=37`
- Chunk boundaries: [30-35], [35-40], [40-45]
- Returns: Chunks [30-35] and [35-40]

The client is responsible for extracting the exact subset from the returned
chunks.

### Boundary Behavior

Be explicit about whether boundaries are inclusive or exclusive:

- `[gte]` and `[lte]` include the boundary value
- `[gt]` and `[lt]` exclude the boundary value

This is especially important for time ranges:

```
# All of January 2024
time[gte]=2024-01-01&time[lt]=2024-02-01

# Through end of January 2024
time[gte]=2024-01-01&time[lte]=2024-01-31T23:59:59
```

## Complex Examples

### Spatial-Temporal Query

```
GET /dataset/ocean-temp/data?time[gte]=2024-01-01&time[lt]=2024-07-01&lat[gte]=30&lat[lt]=45&lon[gte]=-125&lon[lt]=-110&depth[gte]=0&depth[lt]=50
```

Retrieves ocean temperature for:

- First half of 2024
- Latitude 30°N to 45°N
- Longitude 125°W to 110°W
- Surface to 50m depth

### Multi-Variable Selection

```
GET /dataset/weather/data?time=2024-01-15&variable=temperature,humidity,pressure
```

Retrieves three variables for a specific day.

### Filtered Table Query

```
GET /dataset/observations/data?time[gte]=2024-01-01&time[lt]=2024-02-01&quality=good,fair&station_id=KBOS,KORD,KLAX
```

Retrieves observations for:

- January 2024
- Quality of good or fair
- From three specific stations

## Special Characters and Encoding

Query values must be URL-encoded when they contain special characters. For
example, spaces become `%20`.

## Query Limits

Implementations may impose limits on:

- Query complexity (number of dimensions)
- Result size (total bytes)
- Number of chunks returned

When limits are exceeded, the server returns `413 Payload Too Large` with
details about the limit.

## Version Queries

For datasets that support versioning, add the `version` parameter:

```
GET /dataset/weather/data?time[gte]=2024-01-01&time[lt]=2024-02-01&temperature[gte]=20&version=v20240315
```

If version is omitted, the latest version is used. See the [API
Reference](./02-api-reference.md) for version behavior details.
