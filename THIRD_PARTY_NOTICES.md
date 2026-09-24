# Third-Party Notices

This file documents third-party datasets and media referenced or incorporated into this project.

---

## hasaneyldrm/exercises-dataset

- **Repository:** https://github.com/hasaneyldrm/exercises-dataset
- **Commit pinned:** `7455efae41b330c265e7cd4b78dfa848e7ce5ebd`
- **Dataset/code license:** MIT
- **Dataset author:** Hasan Emir Yıldırım

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

### Non-media data used by Gym Web

The project imports the exercise dataset metadata and instruction content, including:

- `id`, `name`, `category`, `body_part`, `equipment`, `target`
- `muscle_group`, `secondary_muscles`
- `instructions`, `instruction_steps`
- `created_at`

These records are imported into `public.exercises` with the source commit pinned above.

### Exercise media

The source repository also contains exercise images and GIFs in `images/` and `videos/`.
Those media assets are identified by the source repository as property of **Gym visual** and
are not covered by the MIT license that applies to the dataset/code.

Gym Web currently downloads the source GIF files from the pinned commit for technical
integration and stores them in the private Supabase Storage bucket `exercise-media`.
Each imported media record is registered in `public.exercise_media` with:

- `license_status = 'pending'`
- `is_active = false`
- source attribution preserved
- SHA-256 checksum recorded

The application does not expose pending media to authenticated end users. The normal
user-facing media helper only returns media when it is active and has an allowed license
status (`licensed` or `owned`).

Storage of these files does **not** mean the media is covered by the dataset's MIT license,
does not transfer copyright, and is not a claim that Gym Web owns the assets. The source
repository's media notice and Gym visual's applicable terms remain separate from the MIT
license for the dataset/code.
