
let knex;
let client;
let connection;

if (!process.env.DATABASE_URL) {
  const config = require('./config.js');
  knex = require('knex')({
    client: 'mysql',
    connection: config.mySql
  });
} else {
  knex = require('knex')({
    client: 'pg',
    connection: process.env.DATABASE_URL,
    ssl: true
  });
}

// if (config.mySql) {
//   knex = require('knex')({
//     client: 'mysql',
//     connection: config.mySql
//   });
// } else {
//   knex = require('knex')({
//     client: 'pg',
//     connection: process.env.DATABASE_URL,
//     ssl: true
//   });
// }

const getAllPosts = () => {
  return knex.column(knex.raw('posts.*, users.username')).select()
    .from(knex.raw('posts, users'))
    .where(knex.raw('posts.user_id = users.user_id'))
    .orderBy('post_id', 'desc');
};

const getUserPosts = (userId) => {
  return knex.column(knex.raw('posts.*, users.username')).select()
    .from('posts')
    .innerJoin('users', 'posts.user_id', 'users.user_id')
    .where('users.user_id', userId)
    .orderBy('posts.post_id', 'desc');
}

const getComments = (postId) => {
  return knex.column(knex.raw('comments.*, users.username')).select()
    .from(knex.raw('comments, users'))
    .where(knex.raw(`comments.post_id = ${postId} and comments.user_id = users.user_id`));
};


const getSubcomments = (commentId) => {
  return knex.select('*').from('subcomments').join('users', function () {
    this.on('subcomments.user_id', '=', 'users.user_id').onIn('subcomments.comment_id', [commentId])
  })
};

const getUserComments = async (userId) => {
  let comments = await knex.select()
    .from('comments')
    .where('user_id', userId);

  for (const comment of comments) {
    let posts = comment.post = await getPostForComment(comment.post_id);
    comment.post = posts[0];
  }
  return comments
}

let getPostForComment = async (postId) => {
  return knex.column(knex.raw('posts.*, users.username')).select()
    .from('posts')
    .innerJoin('users', 'posts.user_id', 'users.user_id')
    .where('posts.post_id', postId)
}


//using async/await
//currently not used
// async function getPostsWithCommentsAsync() {
  //get all posts with username
  // const posts = await knex.select().from('posts')
      // .leftOuterJoin('users', 'users.user_id', 'posts.user_id');

  //returns posts with a comment array inside each post object
  // return Promise.all(posts.map(async (post, index, posts) => {
    //get all comments for the selected post_id
//     const comments = await knex.select().from('comments')
//         .where('post_id', post.post_id);
//     post.comments = comments;
//     return post;
//   }));
// }

const createPost = (post) => {
  return knex('posts').insert({
    user_id: post.userId,
    title: post.title,
    code: post.codebox,
    summary: post.description,
    anon: false //hard coded to false until functionality implemented
  });
};

const createComment = (comment) => {
  return knex('comments').insert({
    user_id: comment.user_id,
    post_id: comment.post_id,
    message: comment.message
  }).orderBy('comment_id', 'asc');
};

const createSubcomment = (subcomment) => {
  return knex('subcomments').insert({
    user_id: subcomment.user_id,
    post_id: subcomment.post_id,
    comment_id: subcomment.comment_id,
    submessage: subcomment.submessage
  }).orderBy('comment_id', 'asc');
};

const checkCredentials = (username) => {
  return knex.select().from('users')
    .where(knex.raw(`LOWER(username) = LOWER('${username}')`));
};

const createUser = async (username, password, email, skills) => {
  const userQuery = await knex.select().from('users')
    .where(knex.raw(`LOWER(username) = LOWER('${username}')`));
  const emailQuery = await knex.select().from('users')
    .where(knex.raw(`LOWER(email) = LOWER('${email}')`));
  if (userQuery.length) {
    return 'username already exists';
  } else if (emailQuery.length) {
    return 'email already exists';
  } else {
    return await knex('users').insert({ username: username, password: password, email: email, skills: skills});
  }
};

const markSolution = async (commentId, postId) => {
  await knex('comments').where('post_id', postId).update('solution', false); //resets comments if something was previously marked as solution
  await knex('comments').where('comment_id', commentId).update('solution', true);
  await knex('posts').where('post_id', postId).update('solution_id', commentId);
};

const unMarkSolution = (commentId) => {
  console.log('commentId:', commentId);
  return knex('comments').where('comment_id', commentId).update('solution', false);
};

const checkCoin = (userId) => {
  return knex.select('hackcoin').from('users').where('user_id', userId);
};

const checkQuestCoin = (userId) => {
  return knex.select('questcoin').from('users').where('user_id', userId);
};

const subtractCoins = async (currenthackcoin, subtractinghackcoin, userId, commentId) => {
  await knex('users').where('user_id', userId).update('questcoin', currenthackcoin - subtractinghackcoin);
  await knex('comments').where('comment_id', commentId).increment('votes', subtractinghackcoin); //update votes by amount of hackcoins subtracted
};

const minusQuestCoin = async (post) => {
  await knex('users').where('user_id', post.userId).update('questcoin', post.questcoin-1);
}

const addQuestCoin = async (post) => {
  await knex('users').where('user_id', post.user_id).update('questcoin', post.questcoin+1);
}

const refreshCoins = () => {
  knex('users').update('hackcoin', 5);
};

const getUsername = async (id) => {
  let user = await knex.select('username').from('users').where('user_id', id);
  return user[0].username;
}

const getUser = async (id) => {
  let user = await knex.select('*').from('users').where('user_id', id);
  return user[0];
}

const doSomething = async (username) => {
  let user = await knex.select('*').from('users').where('username', username);
  return user;
}

const updateUserSkills = async (id, skills) => {
  await knex('users').update('skills', skills).where('user_id', id);
}

const closePost = async (id) => {
  await knex('posts').update('closed', true).where('post_id', id);
}

const getUserNotes = (userId) => {
  return knex.select('*').from('notes').join('users', function () {
    this.on('users.user_id', '=', 'notes.poster_id').onIn('notes.user_profile_id', [userId.profileId])
      
  })
    .orderBy('notes.post_id', 'desc');
}

const createNote = (noteObj) => {
  console.log(noteObj);
  return knex('notes').insert({
    poster_id: noteObj.poster_id,
    user_profile_id: noteObj.user_profile_id,
    note: noteObj.note
  }).orderBy('comment_id', 'asc');
}

module.exports = {
  getAllPosts,
  getUserPosts,
  getUser,
  createPost,
  getComments,
  getUserComments,
  // getPostsWithCommentsAsync,
  checkCredentials,
  createUser,
  createComment,
  markSolution,
  checkCoin,
  subtractCoins,
  refreshCoins,
  createSubcomment,
  getSubcomments,
  getUsername,
  getUsername,
  updateUserSkills,
  closePost,
  getUserNotes,
  createNote,
  unMarkSolution,
  minusQuestCoin,
  addQuestCoin,
  checkQuestCoin, 
  doSomething
};
