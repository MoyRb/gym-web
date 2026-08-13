# Third-Party Notices

This file documents third-party datasets and libraries incorporated into this project.

---

## hasaneyldrm/exercises-dataset

- **Repository:** https://github.com/hasaneyldrm/exercises-dataset
- **Commit pinned:** `7455efae41b330c265e7cd4b78dfa848e7ce5ebd`
- **License:** MIT
- **Copyright:** Copyright (c) hasaneyldrm

### MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### Scope of use in this project

The following **non-media** fields are imported under the MIT license:

- `id`, `name`, `category`, `body_part`, `equipment`, `target`
- `muscle_group`, `secondary_muscles`
- `instructions`, `instruction_steps`
- `created_at`

The following **media assets** are **NOT** part of our product in this release:

- `images/` directory (JPG files)
- `videos/` directory (GIF/video files)
- `image` field (URL referencing Gym Visual assets)
- `gif_url` field (URL referencing Gym Visual assets)

Images and GIFs in `images/` and `videos/` are property of **Gym Visual**
and are **not** covered by the MIT license of the repository metadata.
No commercial license has been obtained for these assets.

Accordingly, this project:
- Does **not** download or store images or GIFs from the dataset
- Does **not** display images or GIFs sourced from Gym Visual
- Does **not** hotlink GitHub or Gym Visual URLs for media purposes
- Stores `image` and `gif_url` fields as excluded/ignored during import

A dedicated `exercise_media` table has been provisioned in the database
to hold future media assets once a valid commercial license is obtained
or original media is produced.
