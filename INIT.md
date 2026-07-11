Create a hackathon voting platform using a Prisma Postgres database and using these views.

Make sure to be as accurate to these designs as possible:
- https://www.figma.com/design/RW0SS1Fy72M9tLil5nk400/Podium-UI2?node-id=132-34&t=6U6LxujEMzg0viz0-11
    - https://www.figma.com/design/RW0SS1Fy72M9tLil5nk400/Podium-UI2?node-id=139-6644&t=6U6LxujEMzg0viz0-11
- https://www.figma.com/design/RW0SS1Fy72M9tLil5nk400/Podium-UI2?node-id=139-6607&t=6U6LxujEMzg0viz0-11
- https://www.figma.com/design/RW0SS1Fy72M9tLil5nk400/Podium-UI2?node-id=142-6717&t=6U6LxujEMzg0viz0-11
- https://www.figma.com/design/RW0SS1Fy72M9tLil5nk400/Podium-UI2?node-id=142-6797&t=6U6LxujEMzg0viz0-11
- https://www.figma.com/design/RW0SS1Fy72M9tLil5nk400/Podium-UI2?node-id=142-6839&t=6U6LxujEMzg0viz0-11
- https://www.figma.com/design/RW0SS1Fy72M9tLil5nk400/Podium-UI2?node-id=147-39&t=6U6LxujEMzg0viz0-11
- https://www.figma.com/design/RW0SS1Fy72M9tLil5nk400/Podium-UI2?node-id=147-81&t=6U6LxujEMzg0viz0-11

Be aware of any shaders or animations present in any Figma file.

You will also need to create an admin view. Use shadcn ui for the admin view.

How this will work:
1. Admin will upload a CSV of participants. This is the particpants who will be able to vote and be added to a team.
2. Participants will go through the project creation and submission flow. 
    - Once the project is created, an airtable entry will be made here: https://airtable.com/app2wgVgZnozM92TT/tblc2ZbkLmfNRXmJf/viwQPQOYgEVYcrams?blocks=hide. Note that some fields will remain empty. Make multiple entries for the same project for each person. Make sure to put their individual hours and hackatime projects for each entry. 
    - Some data will be retrieved via. Hack Club Auth

Make sure to integrate Hack Club Auth: https://auth.hackclub.com/docs

Voting Mode:
- https://www.figma.com/design/RW0SS1Fy72M9tLil5nk400/Podium-UI2?node-id=164-42&t=6U6LxujEMzg0viz0-11
- https://www.figma.com/design/RW0SS1Fy72M9tLil5nk400/Podium-UI2?node-id=132-33&p=f&t=6U6LxujEMzg0viz0-11

Event Stages:
- Draft
- Submission
- Voting
- (Voting) Closed